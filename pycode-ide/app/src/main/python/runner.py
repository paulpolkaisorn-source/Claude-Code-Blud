import builtins
import ctypes
import os
import sys
import threading
import traceback

_tid = None


class _Out:
    encoding = "utf-8"
    errors = "replace"

    def __init__(self, cb):
        self.cb = cb

    def write(self, s):
        if s:
            self.cb.write(str(s))
        return len(s)

    def flush(self):
        pass

    def isatty(self):
        return False

    def writable(self):
        return True


class _In:
    encoding = "utf-8"
    errors = "replace"

    def __init__(self, cb):
        self.cb = cb

    def readline(self, *a):
        s = self.cb.readLine()
        if s is None:
            raise KeyboardInterrupt()
        return str(s) + "\n"

    def read(self, *a):
        return self.readline()

    def isatty(self):
        return False

    def readable(self):
        return True


def run(code, cb, workdir, filename):
    global _tid
    _tid = threading.get_ident()
    sys.stdout = _Out(cb)
    sys.stderr = _Out(cb)
    sys.stdin = _In(cb)
    os.chdir(workdir)
    if workdir not in sys.path:
        sys.path.insert(0, workdir)
    g = {"__name__": "__main__", "__file__": filename, "__builtins__": builtins}
    try:
        exec(compile(code, filename, "exec"), g)
    except SystemExit:
        pass
    except KeyboardInterrupt:
        print("\n[stopped]")
    except BaseException:
        tb = traceback.format_exc().splitlines()
        # hide the runner frames from the traceback
        out = [l for l in tb if "runner.py" not in l and "exec(compile" not in l]
        print("\n".join(out))


def stop():
    if _tid is not None:
        ctypes.pythonapi.PyThreadState_SetAsyncExc(
            ctypes.c_ulong(_tid), ctypes.py_object(KeyboardInterrupt))
