#!/usr/bin/env python3
"""
CoreMind Application - Even or Odd Checker
Simple Python script to check if a number is even or odd.
"""

def is_even(number: int) -> bool:
    """Check if a number is even."""
    return number % 2 == 0


def is_odd(number: int) -> bool:
    """Check if a number is odd."""
    return number % 2 != 0


def check_even_odd(number: int) -> str:
    """Return 'even' or 'odd' for a given number."""
    if is_even(number):
        return "even"
    else:
        return "odd"


def main():
    """Main function to run the even/odd checker."""
    print("Even or Odd Checker")
    print("-" * 20)
    
    try:
        user_input = input("Enter a number: ")
        number = int(user_input)
        
        result = check_even_odd(number)
        print(f"The number {number} is {result}.")
        
    except ValueError:
        print("Error: Please enter a valid integer.")
    except KeyboardInterrupt:
        print("\nGoodbye!")


if __name__ == "__main__":
    main()