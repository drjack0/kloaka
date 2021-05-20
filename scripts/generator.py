#!/usr/bin/python3
import random

choices = [0, 50, 100]

def main():
    st = "flow " + str(random.choice(choices))
    print(st)
    

if __name__ == "__main__":
    main()