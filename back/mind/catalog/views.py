from django.views.decorators.csrf import csrf_exempt

from django.contrib.auth import authenticate, login
from django.contrib.auth.models import User
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
import json

@csrf_exempt
def validate_and_process_user(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            action = data.get('action')  #요청한 작업 처리함
            username = data.get('username')
            email = data.get('email', '')
            password = data.get('password')

            if action == 'register':
                # 회원가입 처리
                if User.objects.filter(email=email).exists():
                    return JsonResponse({'success': False, 'message': "이미 있는 이메일입니다."}, status=400)
                user = User.objects.create_user(username=username, password=password, email=email)
                user.save()
                return JsonResponse({'success': True, 'message': "회원가입에 성공했습니다."}, status=201)

            elif action == 'login':
                # 로그인 처리
                user = authenticate(request, email=email, password=password)  # email 전달
                if user is not None:
                    login(request, user)
                    return JsonResponse({
                        'success': True,
                        'message': "",
                        'user': {
                            'username': user.username,
                            'email': user.email,
                        }
                    }, status=200)
                else:
                    return JsonResponse({'success': False, 'message': "이메일이나 비밀번호가 맞지 않습니다."}, status=401)

        except json.JSONDecodeError:
            return JsonResponse({'success': False, 'message': "JSON 형식이 잘못되었습니다."}, status=400)

    return JsonResponse({'success': False, 'message': "허용되지 않은 요청 방식입니다."}, status=405)