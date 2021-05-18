#!/usr/bin/python3
import random

choices = [0, 50, 100]

def main():
    st = "flow "
    for i in range(5):
        st += str(random.choice(choices)) + " "
    print(st)
    

if __name__ == "__main__":
    main()