from pathlib import Path


def detect_image_type(data: bytes) -> str:
    if data.startswith(b"\xff\xd8\xff"):
        return "jpeg"
    if data.startswith(b"\x89PNG\r\n\x1a\n"):
        return "png"
    if data.startswith(b"RIFF") and data[8:12] == b"WEBP":
        return "webp"
    if data.startswith(b"GIF87a") or data.startswith(b"GIF89a"):
        return "gif"
    return "unknown"


if __name__ == "__main__":
    path = Path("/app/tests/assets/food_sample.jpg")
    raw = path.read_bytes()
    print(detect_image_type(raw))
