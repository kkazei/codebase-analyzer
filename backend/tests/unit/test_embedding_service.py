import pytest
import torch

from app.services.embedding import EmbeddingService


def test_segment_text_splits_long_content() -> None:
    text = "a" * 900

    segments = EmbeddingService._segment_text(text)

    assert len(segments) >= 2
    assert all(len(segment) <= EmbeddingService._SEGMENT_CHAR_LIMIT for segment in segments)


def test_mean_pool_combines_segment_embeddings() -> None:
    pooled = EmbeddingService._mean_pool(
        [
            [1.0, 3.0, 5.0],
            [3.0, 5.0, 7.0],
        ]
    )

    assert pooled == pytest.approx([2.0, 4.0, 6.0])


def test_mean_pool_last_hidden_state_masks_padding_tokens() -> None:
    token_embeddings = torch.tensor(
        [
            [
                [1.0, 1.0, 1.0],
                [3.0, 3.0, 3.0],
                [100.0, 100.0, 100.0],
            ]
        ]
    )
    attention_mask = torch.tensor([[1, 1, 0]])

    pooled = EmbeddingService._mean_pool_last_hidden_state(
        token_embeddings=token_embeddings,
        attention_mask=attention_mask,
    )

    assert pooled.tolist()[0] == pytest.approx([2.0, 2.0, 2.0])
