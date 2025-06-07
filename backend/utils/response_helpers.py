
from flask import jsonify
from typing import Any, Dict

def success_response(data: Any, status_code: int = 200) -> tuple:
    """Create a successful API response"""
    response = {
        'success': True,
        'data': data
    }
    return jsonify(response), status_code

def error_response(message: str, status_code: int = 400, error_code: str = None) -> tuple:
    """Create an error API response"""
    response = {
        'success': False,
        'error': {
            'message': message,
            'code': error_code or f'ERROR_{status_code}'
        }
    }
    return jsonify(response), status_code

def paginated_response(data: list, page: int, per_page: int, total: int) -> Dict[str, Any]:
    """Create a paginated response"""
    return {
        'items': data,
        'pagination': {
            'page': page,
            'per_page': per_page,
            'total': total,
            'pages': (total + per_page - 1) // per_page
        }
    }
