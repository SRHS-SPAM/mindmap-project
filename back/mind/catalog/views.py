from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.http import JsonResponse
import json

@csrf_exempt
def validate_and_process_user(request):
    if request.method == 'POST':
        try:
            
            data = json.loads(request.body)
            action = data.get('action')  # 요청한 작업 처리함
            
            if action == 'register':  # 회원가입
                username = data.get('username')
                email = data.get('email', '')
                password = data.get('password')
                passwordcheck = data.get('passwordcheck')
                
                if User.objects.filter(email=email).exists():
                    return JsonResponse({'success': False, 'message': "이미 있는 이메일입니다."}, status=400)
                if User.objects.filter(password=passwordcheck).exists():
                    return JsonResponse({'success': False, 'message': "비밀번호가 맞지 않습니다."}, status=400)
                user = User.objects.create_user(username=username, password=password, email=email)
                user.save()
                return JsonResponse({'success': True, 'message': "회원가입에 성공했습니다."}, status=201)

            elif action == 'login':  # 로그인
                email = data.get('email')
                password = data.get('password')
                
                # 참고: 기본 User 모델은 username으로 인증하므로 email로 사용자 찾기
                try:
                    user_obj = User.objects.get(email=email)
                    user = authenticate(request, username=user_obj.username, password=password)
                    if user is not None:
                        login(request, user)
                        return JsonResponse({
                            'success': True,
                            'message': "로그인에 성공했습니다.",
                            'user': {
                                'username': user.username,
                                'email': user.email,
                            }
                        }, status=200)
                    else:
                        return JsonResponse({'success': False, 'message': "이메일이나 비밀번호가 맞지 않습니다."}, status=401)
                except User.DoesNotExist:
                    return JsonResponse({'success': False, 'message': "이메일이나 비밀번호가 맞지 않습니다."}, status=401)
            
            elif action == 'logout':  # 로그아웃
                if request.user.is_authenticated:
                    logout(request)
                    return JsonResponse({'success': True, 'message': "로그아웃 되었습니다."}, status=200)
                else:
                    return JsonResponse({'success': False, 'message': "로그인 상태가 아닙니다."}, status=401)
            
            elif action == 'delete':  # 회원탈퇴
                password = data.get('password') #비밀번호 확인
                
                if request.user.is_authenticated:
                    user = authenticate(request, username=request.user.username, password=password)
                    if user is not None:
                        user_to_delete = request.user
                        logout(request)  # 먼저 로그아웃후에
                        user_to_delete.delete()  # 계정 삭제 ㄱㄱ
                        return JsonResponse({'success': True, 'message': "회원탈퇴가 완료되었습니다."}, status=200)
                    else:
                        return JsonResponse({'success': False, 'message': "비밀번호가 일치하지 않습니다."}, status=401)
                else:
                    return JsonResponse({'success': False, 'message': "로그인 되어있지 않습니다.."}, status=401)

        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': "JSON 형식이 잘못되었습니다."}, status=400)
    return JsonResponse({'success': False, 'message': "허용되지 않은 요청 방식입니다."}, status=405)


from django.shortcuts import get_object_or_404
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.decorators import action
from .models import MindMap, Node, ChatMessage, Memo, User
from .serializers import MindMapSerializer, NodeSerializer, ChatMessageSerializer, MemoSerializer, UserSerializer

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    @action(detail=True, methods=['POST'])
    def add_friend(self, request, pk=None):
        user = self.get_object()
        friend_code = request.data.get('friend_code')
        friend = get_object_or_404(User, friend_code=friend_code)
        user.friends.add(friend)
        return Response({'message': 'Friend added successfully'})

class MindMapViewSet(viewsets.ModelViewSet):
    queryset = MindMap.objects.all()
    serializer_class = MindMapSerializer

class NodeViewSet(viewsets.ModelViewSet):
    queryset = Node.objects.all()
    serializer_class = NodeSerializer

class ChatMessageViewSet(viewsets.ModelViewSet):
    queryset = ChatMessage.objects.all()
    serializer_class = ChatMessageSerializer

class MemoViewSet(viewsets.ModelViewSet):
    queryset = Memo.objects.all()
    serializer_class = MemoSerializer
