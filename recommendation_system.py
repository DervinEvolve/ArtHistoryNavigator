from flask_login import current_user
from models import User, LearningPath, Resource
from sqlalchemy import func
from collections import Counter

def get_user_interests(user_id):
    user = User.query.get(user_id)
    if not user:
        return []
    
    # Combine interests from learning paths and resources
    interests = []
    for path in user.learning_paths:
        interests.extend(path.tags.split(','))
    for resource in user.resources:
        interests.extend(resource.tags.split(','))
    
    return [interest.strip().lower() for interest in interests if interest.strip()]

def get_recommendations(user_id, limit=5):
    user_interests = get_user_interests(user_id)
    if not user_interests:
        return []
    
    # Find resources that match user interests
    matching_resources = Resource.query.filter(
        func.lower(Resource.tags).contains(func.lower(interest))
        for interest in user_interests
    ).all()
    
    # Count occurrences of each resource
    resource_counts = Counter(matching_resources)
    
    # Sort resources by relevance (number of matching tags)
    sorted_resources = sorted(resource_counts.items(), key=lambda x: x[1], reverse=True)
    
    # Return top N recommendations
    return [resource for resource, count in sorted_resources[:limit]]

def update_user_history(user_id, resource_id):
    user = User.query.get(user_id)
    resource = Resource.query.get(resource_id)
    
    if user and resource and resource not in user.resources:
        user.resources.append(resource)
        db.session.commit()

# Add this function to the routes in main.py
def get_recommendations_route():
    if current_user.is_authenticated:
        recommendations = get_recommendations(current_user.id)
        return jsonify([resource.to_dict() for resource in recommendations])
    else:
        return jsonify([])
