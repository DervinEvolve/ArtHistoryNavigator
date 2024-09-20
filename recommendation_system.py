from models import User, LearningPath, Resource
from sqlalchemy import func
from collections import Counter

def get_user_interests(user):
    # Extract interests from user's learning paths and resources
    interests = []
    for path in user.learning_paths:
        interests.extend(path.title.lower().split())
        for resource in path.resources:
            interests.extend(resource.title.lower().split())
    return Counter(interests)

def get_user_browsing_history(user):
    # This function should be called when a user views a resource
    # For now, we'll return a mock browsing history
    return Counter(['art', 'renaissance', 'history', 'painting'])

def recommend_learning_paths(user, limit=5):
    user_interests = get_user_interests(user)
    user_history = get_user_browsing_history(user)
    
    # Combine interests and browsing history
    user_preferences = user_interests + user_history
    
    # Get all learning paths not created by the user
    all_paths = LearningPath.query.filter(LearningPath.user_id != user.id).all()
    
    # Score each learning path based on user preferences
    scored_paths = []
    for path in all_paths:
        score = sum(user_preferences.get(word.lower(), 0) for word in path.title.split())
        scored_paths.append((path, score))
    
    # Sort paths by score and return the top 'limit' paths
    recommended_paths = sorted(scored_paths, key=lambda x: x[1], reverse=True)[:limit]
    return [path for path, score in recommended_paths]

def recommend_resources(user, limit=5):
    user_interests = get_user_interests(user)
    user_history = get_user_browsing_history(user)
    
    # Combine interests and browsing history
    user_preferences = user_interests + user_history
    
    # Get all resources not in the user's learning paths
    user_resource_ids = set()
    for path in user.learning_paths:
        user_resource_ids.update(resource.id for resource in path.resources)
    
    all_resources = Resource.query.filter(~Resource.id.in_(user_resource_ids)).all()
    
    # Score each resource based on user preferences
    scored_resources = []
    for resource in all_resources:
        score = sum(user_preferences.get(word.lower(), 0) for word in resource.title.split())
        scored_resources.append((resource, score))
    
    # Sort resources by score and return the top 'limit' resources
    recommended_resources = sorted(scored_resources, key=lambda x: x[1], reverse=True)[:limit]
    return [resource for resource, score in recommended_resources]
