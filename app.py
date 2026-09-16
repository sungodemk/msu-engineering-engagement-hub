import os
from flask import Flask, request, jsonify, render_template, redirect, url_for, session, flash

app = Flask(__name__)

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

@app.route('/overview')
def overview():
    return render_template('company_page/overview.html')

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 8080)), use_reloader=True)