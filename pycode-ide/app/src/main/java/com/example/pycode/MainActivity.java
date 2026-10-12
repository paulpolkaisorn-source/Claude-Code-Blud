package com.example.pycode;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.graphics.Color;
import android.graphics.Rect;
import android.graphics.Typeface;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.text.Editable;
import android.text.InputFilter;
import android.text.InputType;
import android.text.Spanned;
import android.text.TextWatcher;
import android.text.style.ForegroundColorSpan;
import android.util.TypedValue;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.view.inputmethod.EditorInfo;
import android.widget.Button;
import android.widget.EditText;
import android.widget.HorizontalScrollView;
import android.widget.LinearLayout;
import android.widget.ScrollView;
import android.widget.TextView;
import android.widget.Toast;

import com.chaquo.python.PyObject;
import com.chaquo.python.Python;
import com.chaquo.python.android.AndroidPlatform;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.util.Arrays;
import java.util.concurrent.LinkedBlockingQueue;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public class MainActivity extends Activity {
    private static final int BG = Color.parseColor("#1e1e1e");
    private static final int BAR = Color.parseColor("#2d2d30");
    private static final int FG = Color.parseColor("#d4d4d4");
    private static final int C_KW = Color.parseColor("#c586c0");
    private static final int C_STR = Color.parseColor("#ce9178");
    private static final int C_COM = Color.parseColor("#6a9955");
    private static final int C_NUM = Color.parseColor("#b5cea8");
    private static final int C_BI = Color.parseColor("#4fc1ff");
    private static final int C_DEF = Color.parseColor("#dcdcaa");

    private static final String KW = "False|None|True|and|as|assert|async|await|break|class|continue|def|del|elif|else|"
            + "except|finally|for|from|global|if|import|in|is|lambda|nonlocal|not|or|pass|raise|return|try|while|with|yield";
    private static final String BI = "print|input|len|range|int|float|str|list|dict|set|tuple|bool|open|type|isinstance|"
            + "enumerate|zip|map|filter|sorted|sum|min|max|abs|round|super|self|cls|object|Exception|ValueError|KeyError|"
            + "TypeError|IndexError|any|all|reversed|format|repr|id|dir|help|chr|ord|hex|bin|oct|divmod|pow|iter|next";
    private static final Pattern TOKEN = Pattern.compile(
            "(#[^\\n]*)"
            + "|(\"\"\"[\\s\\S]*?(?:\"\"\"|$)|'''[\\s\\S]*?(?:'''|$)|\"(?:\\\\.|[^\"\\\\\\n])*\"?|'(?:\\\\.|[^'\\\\\\n])*'?)"
            + "|(?<=\\bdef |class )(\\w+)"
            + "|\\b(" + KW + ")\\b"
            + "|\\b(" + BI + ")\\b"
            + "|\\b(\\d+\\.?\\d*)\\b");

    private static class Syn extends ForegroundColorSpan {
        Syn(int c) { super(c); }
    }

    private final Handler ui = new Handler(Looper.getMainLooper());
    private EditText editor;
    private TextView lineNums, console, title;
    private ScrollView consoleScroll;
    private EditText stdinBox;
    private LinearLayout root, fsBar;
    private HorizontalScrollView tbScroll, symScroll;
    private ScrollView editScroll;
    private boolean fullscreen = false;
    private float consoleSp = 11, fsSp = 14;
    private File dir, current;
    private SharedPreferences prefs;

    // console state
    private final StringBuilder consoleBuf = new StringBuilder();
    private final StringBuilder pending = new StringBuilder();
    private boolean flushScheduled = false;
    private final LinkedBlockingQueue<String> inQ = new LinkedBlockingQueue<>();
    private volatile boolean running = false;
    private volatile boolean stopping = false;
    private static final String EOF_TOKEN = "\u0000EOF";

    private final Runnable flush = new Runnable() {
        @Override public void run() {
            String s;
            synchronized (pending) {
                s = pending.toString();
                pending.setLength(0);
                flushScheduled = false;
            }
            appendConsole(s);
        }
    };

    /** Passed to Python as sys.stdout / sys.stdin. */
    public class Bridge {
        public void write(String s) {
            synchronized (pending) {
                pending.append(s);
                if (!flushScheduled) {
                    flushScheduled = true;
                    ui.postDelayed(flush, 40);
                }
            }
        }

        public String readLine() {
            try {
                String s = inQ.take();
                if (EOF_TOKEN.equals(s)) return null;
                return s;
            } catch (InterruptedException e) {
                return null;
            }
        }
    }

    private int dp(int v) {
        return (int) TypedValue.applyDimension(TypedValue.COMPLEX_UNIT_DIP, v, getResources().getDisplayMetrics());
    }

    // --------------------------------------------------------------- UI
    @Override
    protected void onCreate(Bundle b) {
        super.onCreate(b);
        prefs = getSharedPreferences("pycode", MODE_PRIVATE);
        dir = new File(getFilesDir(), "projects");
        dir.mkdirs();
        installSamples();
        if (!Python.isStarted()) Python.start(new AndroidPlatform(this));

        root = new LinearLayout(this);
        root.setOrientation(LinearLayout.VERTICAL);
        root.setBackgroundColor(BG);
        setContentView(root);

        // title + toolbar
        title = new TextView(this);
        title.setTextColor(Color.WHITE);
        title.setTypeface(Typeface.DEFAULT_BOLD);
        title.setPadding(dp(12), dp(8), dp(12), dp(2));
        title.setBackgroundColor(BAR);
        root.addView(title);

        tbScroll = new HorizontalScrollView(this);
        tbScroll.setBackgroundColor(BAR);
        tbScroll.setHorizontalScrollBarEnabled(false);
        LinearLayout tb = new LinearLayout(this);
        tbScroll.addView(tb);
        root.addView(tbScroll);
        addTool(tb, "▶ RUN", "#4caf50", v -> runCode());
        addTool(tb, "■ STOP", "#f44336", v -> stopCode());
        addTool(tb, "⛶ FULL RUN", "#4dd0e1", v -> { enterFullscreen(); runCode(); });
        addTool(tb, "⛶ VIEW", "#4dd0e1", v -> enterFullscreen());
        addTool(tb, "NEW", null, v -> newFile());
        addTool(tb, "OPEN", null, v -> openFile());
        addTool(tb, "SAVE", null, v -> { save(); toast("Saved " + current.getName()); });
        addTool(tb, "SAVE AS", null, v -> saveAs());
        addTool(tb, "DELETE", null, v -> deleteFile());
        addTool(tb, "SHARE", null, v -> share());
        addTool(tb, "CLEAR", null, v -> { consoleBuf.setLength(0); console.setText(""); });

        // editor
        editScroll = new ScrollView(this);
        LinearLayout editRow = new LinearLayout(this);
        editRow.setOrientation(LinearLayout.HORIZONTAL);
        editScroll.addView(editRow);

        lineNums = new TextView(this);
        styleCode(lineNums, 14);
        lineNums.setTextColor(Color.parseColor("#858585"));
        lineNums.setGravity(Gravity.END);
        lineNums.setBackgroundColor(Color.parseColor("#252526"));
        lineNums.setPadding(dp(6), dp(6), dp(6), dp(6));
        editRow.addView(lineNums, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.MATCH_PARENT));

        HorizontalScrollView hs = new HorizontalScrollView(this);
        hs.setFillViewport(true);
        editor = new EditText(this);
        styleCode(editor, 14);
        editor.setTextColor(FG);
        editor.setBackground(null);
        editor.setGravity(Gravity.TOP | Gravity.START);
        editor.setHorizontallyScrolling(true);
        editor.setInputType(InputType.TYPE_CLASS_TEXT | InputType.TYPE_TEXT_FLAG_MULTI_LINE
                | InputType.TYPE_TEXT_FLAG_NO_SUGGESTIONS | InputType.TYPE_TEXT_VARIATION_VISIBLE_PASSWORD);
        editor.setPadding(dp(8), dp(6), dp(8), dp(6));
        editor.setMinWidth(getResources().getDisplayMetrics().widthPixels - dp(40));
        editor.setFilters(new InputFilter[]{autoIndent});
        editor.addTextChangedListener(new TextWatcher() {
            @Override public void beforeTextChanged(CharSequence s, int a, int b2, int c) {}
            @Override public void onTextChanged(CharSequence s, int a, int b2, int c) {}
            @Override public void afterTextChanged(Editable e) { highlight(e); updateLines(e); }
        });
        hs.addView(editor, new ViewGroup.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT));
        editRow.addView(hs, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        root.addView(editScroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 3f));

        // symbol bar
        symScroll = new HorizontalScrollView(this);
        symScroll.setBackgroundColor(BAR);
        symScroll.setHorizontalScrollBarEnabled(false);
        LinearLayout sym = new LinearLayout(this);
        symScroll.addView(sym);
        root.addView(symScroll);
        addSym(sym, "TAB", "    ");
        for (String s : Arrays.asList("(", ")", "[", "]", "{", "}", ":", "\"", "'", "=", "#", "_", "<", ">",
                "+", "-", "*", "/", "\\", ",", ".", "!", "&", "|", "%", ";")) addSym(sym, s, s);

        // console
        console = new TextView(this);
        styleCode(console, 11);
        consoleSp = 11;
        console.setTextColor(Color.parseColor("#e0e0e0"));
        console.setTextIsSelectable(true);
        console.setPadding(dp(8), dp(4), dp(8), dp(4));
        consoleScroll = new ScrollView(this);
        consoleScroll.setBackgroundColor(Color.BLACK);
        consoleScroll.addView(console);
        root.addView(consoleScroll, new LinearLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, 0, 2f));

        fsBar = new LinearLayout(this);
        fsBar.setBackgroundColor(BAR);
        fsBar.setVisibility(View.GONE);
        addBar(fsBar, "EXIT ⛶", "#4dd0e1", v -> exitFullscreen());
        addBar(fsBar, "■ STOP", "#f44336", v -> stopCode());
        addBar(fsBar, "↻ RERUN", "#4caf50", v -> { boolean was = running; if (was) stopCode(); ui.postDelayed(this::runCode, was ? 500 : 0); });
        addBar(fsBar, "FIT", "#ffd54f", v -> fitConsole());
        addBar(fsBar, "A-", null, v -> setFsSize(fsSp / 1.15f));
        addBar(fsBar, "A+", null, v -> setFsSize(fsSp * 1.15f));
        root.addView(fsBar);

        LinearLayout inRow = new LinearLayout(this);
        inRow.setBackgroundColor(BAR);
        stdinBox = new EditText(this);
        styleCode(stdinBox, 14);
        stdinBox.setTextColor(Color.WHITE);
        stdinBox.setHint("input() → type here, then SEND");
        stdinBox.setHintTextColor(Color.GRAY);
        stdinBox.setSingleLine(true);
        stdinBox.setImeOptions(EditorInfo.IME_ACTION_SEND);
        stdinBox.setOnEditorActionListener((v, id, ev) -> { sendInput(); return true; });
        inRow.addView(stdinBox, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
        Button send = new Button(this);
        send.setText("SEND");
        send.setOnClickListener(v -> sendInput());
        inRow.addView(send);
        root.addView(inRow);

        root.getViewTreeObserver().addOnGlobalLayoutListener(() -> {
            if (!fullscreen) {
                if (root.getPaddingBottom() != 0) root.setPadding(0, 0, 0, 0);
                return;
            }
            Rect r = new Rect();
            View decor = getWindow().getDecorView();
            decor.getWindowVisibleDisplayFrame(r);
            int full = decor.getRootView().getHeight();
            int kb = full - r.bottom;
            int pad = kb > full * 0.15 ? kb : 0;
            if (root.getPaddingBottom() != pad) root.setPadding(0, 0, 0, pad);
        });

        String last = prefs.getString("last", "hello.py");
        File f = new File(dir, last);
        if (!f.exists()) f = new File(dir, "hello.py");
        openPath(f);
        appendConsole("PyCode ready. Python " + pyVersion() + "\n");
    }

    private String pyVersion() {
        try {
            return Python.getInstance().getModule("sys").get("version").toString().split(" ")[0];
        } catch (Exception e) {
            return "?";
        }
    }

    private void styleCode(TextView t, int sp) {
        t.setTypeface(Typeface.MONOSPACE);
        t.setTextSize(TypedValue.COMPLEX_UNIT_SP, sp);
        t.setIncludeFontPadding(false);
    }

    private void addTool(LinearLayout row, String text, String color, View.OnClickListener l) {
        Button b = new Button(this);
        b.setText(text);
        b.setAllCaps(false);
        b.setBackgroundColor(Color.TRANSPARENT);
        b.setTextColor(color == null ? Color.WHITE : Color.parseColor(color));
        b.setTypeface(Typeface.DEFAULT_BOLD);
        b.setMinWidth(0);
        b.setMinimumWidth(0);
        b.setOnClickListener(l);
        row.addView(b);
    }

    private void addBar(LinearLayout row, String text, String color, View.OnClickListener l) {
        Button b = new Button(this);
        b.setText(text);
        b.setAllCaps(false);
        b.setBackgroundColor(Color.TRANSPARENT);
        b.setTextColor(color == null ? Color.WHITE : Color.parseColor(color));
        b.setTypeface(Typeface.DEFAULT_BOLD);
        b.setMinWidth(0);
        b.setMinimumWidth(0);
        b.setPadding(dp(6), 0, dp(6), 0);
        b.setOnClickListener(l);
        row.addView(b, new LinearLayout.LayoutParams(0, ViewGroup.LayoutParams.WRAP_CONTENT, 1f));
    }

    // ------------------------------------------------------- fullscreen
    private void applyImmersive() {
        getWindow().getDecorView().setSystemUiVisibility(
                View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                        | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_FULLSCREEN
                        | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                        | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                        | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN);
    }

    private void enterFullscreen() {
        fullscreen = true;
        title.setVisibility(View.GONE);
        tbScroll.setVisibility(View.GONE);
        editScroll.setVisibility(View.GONE);
        symScroll.setVisibility(View.GONE);
        fsBar.setVisibility(View.VISIBLE);
        console.setTextSize(TypedValue.COMPLEX_UNIT_SP, fsSp);
        applyImmersive();
        toast("Fullscreen - Back button exits");
    }

    private void exitFullscreen() {
        fullscreen = false;
        title.setVisibility(View.VISIBLE);
        tbScroll.setVisibility(View.VISIBLE);
        editScroll.setVisibility(View.VISIBLE);
        symScroll.setVisibility(View.VISIBLE);
        fsBar.setVisibility(View.GONE);
        console.setTextSize(TypedValue.COMPLEX_UNIT_SP, consoleSp);
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_VISIBLE);
        root.setPadding(0, 0, 0, 0);
    }

    private void setFsSize(float sp) {
        fsSp = Math.max(5f, Math.min(40f, sp));
        console.setTextSize(TypedValue.COMPLEX_UNIT_SP, fsSp);
    }

    /** Pick the biggest font where 42 monospace columns fit the screen width. */
    private void fitConsole() {
        float widthPx = getResources().getDisplayMetrics().widthPixels - dp(16);
        float px = widthPx / (42f * 0.6f);
        setFsSize(px / getResources().getDisplayMetrics().scaledDensity);
    }

    @Override
    public void onBackPressed() {
        if (fullscreen) exitFullscreen();
        else super.onBackPressed();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus && fullscreen) applyImmersive();
    }

    private void addSym(LinearLayout row, String label, final String ins) {
        Button b = new Button(this);
        b.setText(label);
        b.setAllCaps(false);
        b.setTextColor(Color.WHITE);
        b.setBackgroundColor(Color.TRANSPARENT);
        b.setMinWidth(0);
        b.setMinimumWidth(dp(40));
        b.setOnClickListener(v -> {
            int s = Math.max(editor.getSelectionStart(), 0);
            int e = Math.max(editor.getSelectionEnd(), 0);
            editor.getText().replace(Math.min(s, e), Math.max(s, e), ins);
        });
        row.addView(b);
    }

    private void toast(String s) { Toast.makeText(this, s, Toast.LENGTH_SHORT).show(); }

    // ------------------------------------------------------ editor logic
    private final InputFilter autoIndent = new InputFilter() {
        @Override
        public CharSequence filter(CharSequence src, int start, int end, Spanned dest, int ds, int de) {
            if (end - start == 1 && src.charAt(start) == '\n') {
                int ls = ds;
                while (ls > 0 && dest.charAt(ls - 1) != '\n') ls--;
                StringBuilder ind = new StringBuilder();
                int i = ls;
                while (i < ds && (dest.charAt(i) == ' ' || dest.charAt(i) == '\t')) { ind.append(dest.charAt(i)); i++; }
                int k = ds - 1;
                while (k >= ls && dest.charAt(k) == ' ') k--;
                if (k >= ls && dest.charAt(k) == ':') ind.append("    ");
                return "\n" + ind;
            }
            return null;
        }
    };

    private void highlight(Editable e) {
        for (Syn s : e.getSpans(0, e.length(), Syn.class)) e.removeSpan(s);
        if (e.length() > 60000) return;
        Matcher m = TOKEN.matcher(e);
        while (m.find()) {
            int color;
            if (m.group(1) != null) color = C_COM;
            else if (m.group(2) != null) color = C_STR;
            else if (m.group(3) != null) color = C_DEF;
            else if (m.group(4) != null) color = C_KW;
            else if (m.group(5) != null) color = C_BI;
            else color = C_NUM;
            e.setSpan(new Syn(color), m.start(), m.end(), Spanned.SPAN_EXCLUSIVE_EXCLUSIVE);
        }
    }

    private void updateLines(Editable e) {
        int n = 1;
        for (int i = 0; i < e.length(); i++) if (e.charAt(i) == '\n') n++;
        StringBuilder sb = new StringBuilder();
        for (int i = 1; i <= n; i++) { if (i > 1) sb.append('\n'); sb.append(i); }
        lineNums.setText(sb);
    }

    // ------------------------------------------------------------ files
    private void installSamples() {
        try {
            String[] names = getAssets().list("samples");
            if (names == null) return;
            for (String n : names) {
                File out = new File(dir, n);
                if (out.exists()) continue;
                try (InputStream in = getAssets().open("samples/" + n);
                     FileOutputStream fo = new FileOutputStream(out)) {
                    byte[] buf = new byte[8192];
                    int r;
                    while ((r = in.read(buf)) > 0) fo.write(buf, 0, r);
                }
            }
        } catch (Exception ignored) {
        }
    }

    private String readFile(File f) {
        try (InputStream in = new java.io.FileInputStream(f)) {
            ByteArrayOutputStream bo = new ByteArrayOutputStream();
            byte[] buf = new byte[8192];
            int r;
            while ((r = in.read(buf)) > 0) bo.write(buf, 0, r);
            return bo.toString("UTF-8");
        } catch (Exception e) {
            return "";
        }
    }

    private void writeFile(File f, String text) {
        try (FileOutputStream fo = new FileOutputStream(f)) {
            fo.write(text.getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            toast("Save failed: " + e.getMessage());
        }
    }

    private void openPath(File f) {
        current = f;
        editor.setText(readFile(f));
        title.setText(f.getName());
        prefs.edit().putString("last", f.getName()).apply();
    }

    private void save() {
        if (current != null) writeFile(current, editor.getText().toString());
    }

    private String[] listPy() {
        String[] names = dir.list((d, n) -> n.endsWith(".py"));
        if (names == null) names = new String[0];
        Arrays.sort(names);
        return names;
    }

    private void openFile() {
        save();
        final String[] names = listPy();
        new AlertDialog.Builder(this).setTitle("Open file")
                .setItems(names, (d, i) -> openPath(new File(dir, names[i])))
                .setNegativeButton("Cancel", null).show();
    }

    private void askName(String ttl, String def, final java.util.function.Consumer<String> done) {
        final EditText in = new EditText(this);
        in.setText(def);
        in.setSingleLine(true);
        new AlertDialog.Builder(this).setTitle(ttl).setView(in)
                .setPositiveButton("OK", (d, w) -> {
                    String n = in.getText().toString().trim().replaceAll("[^A-Za-z0-9_.\\- ]", "_");
                    if (n.isEmpty()) return;
                    if (!n.endsWith(".py")) n += ".py";
                    done.accept(n);
                }).setNegativeButton("Cancel", null).show();
    }

    private void newFile() {
        save();
        askName("New file name", "script.py", n -> {
            File f = new File(dir, n);
            if (!f.exists()) writeFile(f, "");
            openPath(f);
        });
    }

    private void saveAs() {
        askName("Save as", current == null ? "script.py" : current.getName(), n -> {
            File f = new File(dir, n);
            writeFile(f, editor.getText().toString());
            openPath(f);
            toast("Saved " + n);
        });
    }

    private void deleteFile() {
        if (current == null) return;
        new AlertDialog.Builder(this).setTitle("Delete " + current.getName() + "?")
                .setPositiveButton("Delete", (d, w) -> {
                    current.delete();
                    String[] n = listPy();
                    if (n.length == 0) writeFile(new File(dir, "script.py"), "");
                    n = listPy();
                    openPath(new File(dir, n[0]));
                }).setNegativeButton("Cancel", null).show();
    }

    private void share() {
        Intent i = new Intent(Intent.ACTION_SEND);
        i.setType("text/plain");
        i.putExtra(Intent.EXTRA_SUBJECT, current.getName());
        i.putExtra(Intent.EXTRA_TEXT, editor.getText().toString());
        startActivity(Intent.createChooser(i, "Share code"));
    }

    @Override protected void onPause() { super.onPause(); save(); }

    // -------------------------------------------------------------- run
    private void runCode() {
        if (running) { toast("Already running - press STOP first"); return; }
        save();
        consoleBuf.setLength(0);
        console.setText("");
        synchronized (pending) { pending.setLength(0); }
        inQ.clear();
        stopping = false;
        running = true;
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
        final String code = editor.getText().toString();
        final String name = current.getName();
        final String wd = dir.getAbsolutePath();
        final Bridge bridge = new Bridge();
        new Thread(() -> {
            try {
                PyObject mod = Python.getInstance().getModule("runner");
                mod.callAttr("run", code, bridge, wd, name);
            } catch (Throwable t) {
                bridge.write("\n" + t + "\n");
            }
            running = false;
            bridge.write("\n[finished]\n");
            ui.post(() -> getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON));
        }, "py-run").start();
    }

    private void stopCode() {
        if (!running) return;
        stopping = true;
        inQ.offer(EOF_TOKEN);
        new Thread(() -> {
            try {
                Python.getInstance().getModule("runner").callAttr("stop");
            } catch (Throwable ignored) {
            }
        }).start();
    }

    private void sendInput() {
        String s = stdinBox.getText().toString();
        stdinBox.setText("");
        if (!running) { toast("Program is not running"); return; }
        appendConsole(s + "\n");
        inQ.offer(s);
    }

    private static final Pattern ANSI = Pattern.compile("\u001b\\[[0-9;?]*[A-Za-z]");

    private void appendConsole(String s) {
        if (s.isEmpty()) return;
        int clear = Math.max(s.lastIndexOf("\u001b[H"), s.lastIndexOf("\u001b[2J"));
        if (clear >= 0) {
            consoleBuf.setLength(0);
            s = s.substring(clear);
        }
        s = ANSI.matcher(s).replaceAll("").replace("\r\n", "\n").replace("\r", "");
        s = s.replace("\u001bc", "");
        consoleBuf.append(s);
        if (consoleBuf.length() > 30000) consoleBuf.delete(0, consoleBuf.length() - 30000);
        console.setText(consoleBuf);
        consoleScroll.post(() -> consoleScroll.fullScroll(View.FOCUS_DOWN));
    }
}
