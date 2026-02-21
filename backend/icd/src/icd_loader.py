"""ICD-10 code loader and mapping utilities."""

import json
from pathlib import Path
from typing import Optional

from rapidfuzz import fuzz, process


class ICDLoader:
    """Loads and provides ICD-10 code lookup and fuzzy mapping."""

    def __init__(self, json_path: str | Path):
        self.json_path = Path(json_path)
        self._codes: dict[str, str] = {}
        self._load()

    def _load(self) -> None:
        """Load ICD codes from JSON file."""
        if not self.json_path.exists():
            raise FileNotFoundError(f"ICD codes file not found: {self.json_path}")

        with open(self.json_path, "r", encoding="utf-8") as f:
            self._codes = json.load(f)

    @property
    def codes(self) -> dict[str, str]:
        """Return full ICD code to description mapping."""
        return self._codes

    def get_by_code(self, code: str) -> Optional[str]:
        """Get disease description by exact ICD-10 code."""
        return self._codes.get(code.upper().strip())

    def search_by_description(self, query: str, limit: int = 10) -> list[tuple[str, str, float]]:
        """
        Fuzzy search for ICD codes by disease description.
        Returns list of (code, description, score) tuples sorted by relevance.
        """
        if not query or not query.strip():
            return []

        # Build list of (description, code) for search
        descriptions = list(self._codes.values())
        codes = list(self._codes.keys())

        # Create mapping: description -> [(code1, code2, ...)] for descriptions that match multiple codes
        desc_to_codes: dict[str, list[str]] = {}
        for code, desc in self._codes.items():
            desc_to_codes.setdefault(desc, []).append(code)

        # Get unique descriptions for faster search
        unique_descs = list(set(descriptions))

        # Fuzzy match against descriptions
        results = process.extract(
            query,
            unique_descs,
            scorer=fuzz.token_set_ratio,
            limit=limit * 2,  # Get more to handle multiple codes per description
        )

        output: list[tuple[str, str, float]] = []
        seen: set[str] = set()
        for desc, score, _ in results:
            for code in desc_to_codes.get(desc, []):
                key = f"{code}|{desc}"
                if key not in seen:
                    seen.add(key)
                    output.append((code, desc, float(score)))
                    if len(output) >= limit:
                        break
            if len(output) >= limit:
                break

        return output[:limit]

    def get_codes_for_mapping_prompt(self, disease: str, top_k: int = 20) -> str:
        """
        Get top matching ICD codes formatted for LLM prompt.
        Returns a string of code: description pairs for the mapping step.
        """
        results = self.search_by_description(disease, limit=top_k)
        if not results:
            return "No matching codes found."

        lines = [f"- {code}: {desc}" for code, desc, _ in results]
        return "\n".join(lines)
