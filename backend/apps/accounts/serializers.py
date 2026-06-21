from rest_framework import serializers

from .models import UserProfile


class UserProfileSerializer(serializers.ModelSerializer[UserProfile]):
    class Meta:
        model = UserProfile
        fields = ["cognito_sub", "email", "display_name", "created_at"]
        read_only_fields = ["cognito_sub", "created_at"]
