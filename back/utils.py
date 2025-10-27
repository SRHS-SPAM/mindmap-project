import random
import string

def create_friend_code(length: int = 7) -> str:
    """
    대문자 알파벳과 숫자를 조합하여 고유한 친구 코드를 생성합니다.
    """
    characters = string.ascii_uppercase + string.digits
    return ''.join(random.choice(characters) for i in range(length))