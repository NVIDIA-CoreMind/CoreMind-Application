"""Automated tests for CoreMindAgentDemo string utilities."""

import unittest

from CoreMindAgentDemo.string_utils import (
    count_characters,
    count_words,
    is_palindrome,
    reverse_string,
)


class TestReverseString(unittest.TestCase):
    def test_normal_string(self):
        self.assertEqual(reverse_string("hello"), "olleh")

    def test_empty_string(self):
        self.assertEqual(reverse_string(""), "")

    def test_single_character(self):
        self.assertEqual(reverse_string("a"), "a")

    def test_with_spaces(self):
        self.assertEqual(reverse_string("ab c"), "c ba")


class TestCountWords(unittest.TestCase):
    def test_normal_sentence(self):
        self.assertEqual(count_words("hello world"), 2)

    def test_multiple_spaces(self):
        self.assertEqual(count_words("  hello   world  "), 2)

    def test_empty_string(self):
        self.assertEqual(count_words(""), 0)

    def test_single_word(self):
        self.assertEqual(count_words("hello"), 1)

    def test_only_whitespace(self):
        self.assertEqual(count_words("   "), 0)


class TestIsPalindrome(unittest.TestCase):
    def test_simple_palindrome(self):
        self.assertTrue(is_palindrome("radar"))

    def test_mixed_case_palindrome(self):
        self.assertTrue(is_palindrome("Racecar"))

    def test_with_punctuation(self):
        self.assertTrue(is_palindrome("A man, a plan, a canal: Panama"))

    def test_not_palindrome(self):
        self.assertFalse(is_palindrome("hello"))

    def test_empty_string(self):
        self.assertTrue(is_palindrome(""))

    def test_single_character(self):
        self.assertTrue(is_palindrome("a"))


class TestCountCharacters(unittest.TestCase):
    def test_normal_string(self):
        self.assertEqual(count_characters("hello"), {"h": 1, "e": 1, "l": 2, "o": 1})

    def test_empty_string(self):
        self.assertEqual(count_characters(""), {})

    def test_repeated_characters(self):
        self.assertEqual(count_characters("aaabbb"), {"a": 3, "b": 3})

    def test_single_character(self):
        self.assertEqual(count_characters("a"), {"a": 1})


if __name__ == "__main__":
    unittest.main()