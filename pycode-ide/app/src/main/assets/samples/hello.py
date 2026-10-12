# Welcome to PyCode! Press RUN to execute.
name = input("What is your name? ")
print("Hello,", name)

for i in range(1, 6):
    print(i, "squared is", i * i)

import math, random
print("pi =", round(math.pi, 4), "| dice:", random.randint(1, 6))
