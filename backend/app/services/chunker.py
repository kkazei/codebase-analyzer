from dataclasses import dataclass


@dataclass
class TextChunk:
    path: str
    language: str
    chunk_index: int
    text: str


class Chunker:
    def __init__(self, chunk_size: int, chunk_overlap: int) -> None:
        if chunk_overlap >= chunk_size:
            raise ValueError("chunk_overlap must be smaller than chunk_size")
        self._chunk_size = chunk_size
        self._chunk_overlap = chunk_overlap

    def chunk_file(self, path: str, language: str, content: str) -> list[TextChunk]:
        normalized = content.strip()
        if not normalized:
            return []

        chunks: list[TextChunk] = []
        start = 0
        chunk_index = 0
        length = len(normalized)

        while start < length:
            end = min(start + self._chunk_size, length)
            if end < length:
                split_at = normalized.rfind("\n", start + int(self._chunk_size * 0.6), end)
                if split_at > start:
                    end = split_at

            chunk_text = normalized[start:end].strip()
            if chunk_text:
                chunks.append(
                    TextChunk(
                        path=path,
                        language=language,
                        chunk_index=chunk_index,
                        text=chunk_text,
                    )
                )
                chunk_index += 1

            if end >= length:
                break

            next_start = end - self._chunk_overlap
            if next_start <= start:
                next_start = end
            start = next_start

        return chunks
