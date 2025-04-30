from django.urls import path
from .views import hello_json, tunnel_api

urlpatterns = [
    path('hello/', hello_json),
    path('api/', tunnel_api),
]
