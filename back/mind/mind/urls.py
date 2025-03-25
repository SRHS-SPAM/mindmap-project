"""
URL configuration for mind project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from catalog.views import MindMapViewSet, NodeViewSet, ChatMessageViewSet, MemoViewSet, UserViewSet

router = DefaultRouter()
router.register(r'mindmaps', MindMapViewSet)
router.register(r'nodes', NodeViewSet)
router.register(r'chat', ChatMessageViewSet)
router.register(r'memos', MemoViewSet)
router.register(r'users', UserViewSet)

urlpatterns = [
    path('api/', include(router.urls)),
]
