from django.urls import path, re_path
from .views import tunnel_api

urlpatterns = [
    re_path(r'(?P<path>.*)$', tunnel_api),
]
