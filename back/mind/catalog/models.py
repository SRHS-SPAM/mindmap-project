from django.db import models
import uuid
import random
import string

# 친구 코드 생성 함수
def generate_friend_code():
    while True:
        code = ''.join(random.choices(string.ascii_letters + string.digits, k=5))
        if not User.objects.filter(friend_code=code).exists():
            return code

# 사용자 모델
class User(models.Model):
    username = models.CharField(max_length=100)
    friend_code = models.CharField(max_length=5, unique=True, default=generate_friend_code)
    friends = models.ManyToManyField('self', blank=True)
    is_online = models.BooleanField(default=False)

# 마인드맵 모델
class MindMap(models.Model):
    owner = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=255)
    is_completed = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

# 노드(주제) 모델
class Node(models.Model):
    mindmap = models.ForeignKey(MindMap, on_delete=models.CASCADE, related_name='nodes')
    content = models.TextField()
    parent = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='children')
    position_x = models.FloatField(default=0)
    position_y = models.FloatField(default=0)

# 노드 간 연결 모델
class Connection(models.Model):
    from_node = models.ForeignKey(Node, on_delete=models.CASCADE, related_name='from_connections')
    to_node = models.ForeignKey(Node, on_delete=models.CASCADE, related_name='to_connections')

# 채팅 메시지 모델
class ChatMessage(models.Model):
    mindmap = models.ForeignKey(MindMap, on_delete=models.CASCADE, related_name='chat_messages')
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

# 요약 모델
class Summary(models.Model):
    node = models.ForeignKey(Node, on_delete=models.CASCADE, related_name='summaries')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

# 메모 모델
class Memo(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    summary = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
