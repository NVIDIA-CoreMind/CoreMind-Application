# CoreMindAgentDemo

A small Python project demonstrating string utility functions and automated testing.

## Project Structure

```
CoreMindAgentDemo/
├── string_utils.py   # String utility functions
├── tests/
│   └── test_string_utils.py  # Unit tests
└── README.md         # This file
```

## String Utility Functions

### `reverse_string(s: str) -> str`
Returns the input string reversed.

### `count_words(s: str) -> int`
Counts the number of words in a string. Words are separated by whitespace.
Multiple consecutive whitespaces are treated as a single delimiter.
Returns 0 for empty strings.

### `is_palindrome(s: str) -> bool`
Checks if a string is a palindrome. The check ignores case and non-alphanumeric characters.

### `count_characters(s: str) -> dict`
Counts the frequency of each character in a string.
Returns a dictionary mapping each character to its frequency count.

## Running Tests

```bash
# From the project root (CoreMindAgentDemo/)
python -m pytest tests/test_string_utils.py
# Or using unittest directly:
python -m unittest tests.test_string_utils
```

## Execution Example

```python
from CoreMindAgentDemo.string_utils import reverse_string, count_words, is_palindrome, count_characters

print(reverse_string("hello"))          # "olleh"
print(count_words("hello world"))       # 2
print(is_palindrome("Racecar"))         # True
print(count_characters("hello"))        # {'h': 1, 'e': 1, 'l': 2, 'o': 1}
```