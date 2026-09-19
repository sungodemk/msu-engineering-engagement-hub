import os
from flask import Flask, request, jsonify, render_template, redirect, url_for, session, flash
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

@app.route('/')
def root():
    return redirect('/home')

@app.route('/home')
def home():
    return render_template('Homepage.html')

@app.route('/company')
def company():
    return render_template('company_page/company_page.html')

@app.route('/persons')
def persons():
    return render_template('Persons_page.html')

@app.route('/portfolio')
def portfolio():
    return render_template('Portfolio_page.html')

@app.route('/stewardship')
def stewardship():
    return render_template('Stewardship_queue_page.html')

@app.route('/company_page_overview')
def overview():
    return render_template('company_page/overview.html')

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), use_reloader=True)