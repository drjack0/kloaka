#!/usr/bin/python3
import random

events_file = "events.txt"

def main():
    with open(events_file, "r+") as fr:
        vals = [int (x) for x in fr.read().split(" ")]
        st = "flow " + " ".join(vals)
        print(st)
    

if __name__ == "__main__":
    main()