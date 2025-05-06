from django.urls import path, re_path
from .views import hello_json, tunnel_api

urlpatterns = [
    path('hello/', hello_json),
    re_path(r'(?P<path>.*)$', tunnel_api),
]
