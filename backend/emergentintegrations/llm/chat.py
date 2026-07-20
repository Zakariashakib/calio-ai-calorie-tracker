class ImageContent:
    def __init__(self, image_base64=None): pass

class TextDelta:
    def __init__(self, content): self.content = content

class StreamDone:
    pass

class UserMessage:
    def __init__(self, text=None, file_contents=None): pass

class LlmChat:
    def __init__(self, api_key=None, session_id=None, system_message=None): pass
    def with_model(self, *args, **kwargs): return self
    def with_params(self, *args, **kwargs): return self
    async def stream_message(self, message):
        yield TextDelta('{"meal_name": "Mock Meal", "total_weight_g": 100, "confidence": 0.9, "warnings": [], "guidance": "Mock", "foods": []}')
        yield StreamDone()
