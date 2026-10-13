"""String utility module for CoreMindAgentDemo."""

def reverse_string(s: str) -> str:
    """Reverse the input string.

    Args:
        s: The string to reverse.

    Returns:
        The reversed string.
    """
    return s[::-1]


def count_words(s: str) -> int:
    """Count the number of words in a string.

    Words are separated by whitespace. Multiple consecutive whitespaces
    are treated as a single delimiter.

    Args:
        s: The string to count words in.

    Returns:
        The number of words in the string. Returns 0 for empty strings.
    """
    return len(s.split())


def is_palindrome(s: str) -> bool:
    """Check if a string is a palindrome.

    A palindrome reads the same forwards and backwards when ignoring
    case and non-alphanumeric characters.

    Args:
        s: The string to check.

    Returns:
        True if the string is a palindrome, False otherwise.
    """
    cleaned = ''.join(ch.lower() for ch in s if ch.isalnum())
    return cleaned == cleaned[::-1]


def count_characters(s: str) -> dict:
    """Count the frequency of each character in a string.

    Args:
        s: The string to count characters in.

    Returns:
        A dictionary mapping each character to its frequency count.
    """
    freq = {}
    for ch in s:
        freq[ch] = freq.get(ch, 0) + 1
    return freq