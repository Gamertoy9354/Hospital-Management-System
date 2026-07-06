from flask import Flask, jsonify
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv
from config import Config
import traceback

load_dotenv()

from routes.auth import auth_bp
from routes.hospital_config import config_bp
from routes.staff import staff_bp
from routes.patients import patients_bp
from routes.visits import visits_bp
from routes.prescriptions import prescriptions_bp
from routes.beds import beds_bp
from routes.tokens import tokens_bp
from routes.notifications import notifications_bp
from routes.lab_reports import lab_bp
from routes.dashboard import dashboard_bp
from routes.admissions import admissions_bp


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    app.url_map.strict_slashes = False
    CORS(app, origins='*', supports_credentials=True)
    JWTManager(app)

    for bp in [
        auth_bp, config_bp, staff_bp, patients_bp, visits_bp,
        prescriptions_bp, beds_bp, tokens_bp, notifications_bp,
        lab_bp, dashboard_bp, admissions_bp
    ]:
        app.register_blueprint(bp)

    @app.route('/api/health', methods=['GET'])
    def health():
        return {'status': 'ok'}, 200

    # Global error handler — ensures CORS headers are always present
    @app.errorhandler(Exception)
    def handle_exception(e):
        tb = traceback.format_exc()
        print(f"\n❌ UNHANDLED ERROR:\n{tb}")
        return jsonify({'error': str(e), 'traceback': tb}), 500

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({'error': 'Endpoint not found'}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({'error': 'Method not allowed'}), 405

    return app


app = create_app()

if __name__ == '__main__':
    app.run(debug=True, port=5000)
