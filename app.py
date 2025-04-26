from flask import Flask, render_template, request, jsonify
import pandas as pd
from datetime import datetime
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
import io
import base64

app = Flask(__name__)

# Load the dataset
df = pd.read_csv('Sample_dataset_no_liza.csv')

# Convert date columns to datetime and normalize formats
df['Transaction date'] = pd.to_datetime(df['Transaction date']).dt.normalize()

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/single_transaction')
def single_transaction():
    return render_template('single_transaction.html')

@app.route('/transaction_range')
def transaction_range():
    return render_template('transaction_range.html')

@app.route('/predict_single', methods=['POST'])
def predict_single():
    try:
        merchant_id = request.form['merchant_id'].strip()
        amount = float(request.form['amount'])
        
        # Find matching transactions with tolerance for floating point amounts
        matches = df[(df['Merchant_id'].astype(str).str.strip() == merchant_id) & 
                    (df['Transaction_amount'].astype(float).round(2) == round(amount, 2))]
        
        if len(matches) == 0:
            return jsonify({'result': 'No matching transaction found in dataset'})
        
        fraud_status = matches.iloc[0]['isFradulent']
        
        if fraud_status == 'Y':
            return jsonify({'result': 'Fraud Transaction'})
        else:
            return jsonify({'result': 'Safe Transaction'})
    except Exception as e:
        return jsonify({'result': f'Error processing request: {str(e)}'})

@app.route('/analyze_range', methods=['POST'])
def analyze_range():
    try:
        # Get and validate dates
        start_date_str = request.form['start_date']
        end_date_str = request.form['end_date']
        
        # Convert to datetime objects
        start_date = pd.to_datetime(start_date_str).normalize()
        end_date = pd.to_datetime(end_date_str).normalize()
        
        # Ensure dates are in correct order
        if start_date > end_date:
            return jsonify({'error': 'Start date must be before end date'})
        
        # Filter transactions within date range (inclusive)
        mask = (df['Transaction date'] >= start_date) & (df['Transaction date'] <= end_date)
        filtered_df = df.loc[mask]
        
        # If no transactions found, provide debug info
        if len(filtered_df) == 0:
            dataset_start = df['Transaction date'].min().strftime('%Y-%m-%d')
            dataset_end = df['Transaction date'].max().strftime('%Y-%m-%d')
            return jsonify({
                'error': f'No transactions found between {start_date_str} and {end_date_str}',
                'debug_info': f'Dataset contains transactions from {dataset_start} to {dataset_end}'
            })
        
        # Calculate statistics
        total_transactions = len(filtered_df)
        fraud_transactions = len(filtered_df[filtered_df['isFradulent'] == 'Y'])
        accuracy = round((total_transactions - fraud_transactions) / total_transactions * 100, 2)
        
        # Prepare sample data
        sample_cols = ['Merchant_id', 'first', 'last', 'Transaction_amount', 'isFradulent']
        first_two = filtered_df[sample_cols].head(2).to_dict('records')
        last_two = filtered_df[sample_cols].tail(2).to_dict('records')
        
        # Generate charts
        line_chart = generate_line_chart(filtered_df)
        pie_chart = generate_pie_chart(total_transactions - fraud_transactions, fraud_transactions)
        
        return jsonify({
            'total_transactions': total_transactions,
            'fraud_transactions': fraud_transactions,
            'accuracy': accuracy,
            'first_two': first_two,
            'last_two': last_two,
            'line_chart': line_chart,
            'pie_chart': pie_chart
        })
        
    except Exception as e:
        return jsonify({'error': f'Error processing request: {str(e)}'})
    
def generate_line_chart(df):
    # Group by date and count transactions
    daily_counts = df.groupby(df['Transaction date'].dt.date).size()
    
    plt.figure(figsize=(10, 5))
    plt.plot(daily_counts.index, daily_counts.values, marker='o')
    plt.title('Daily Transaction Count')
    plt.xlabel('Date')
    plt.ylabel('Number of Transactions')
    plt.grid(True)
    plt.tight_layout()
    
    # Save plot to a bytes buffer
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    plt.close()
    
    # Convert to base64 for embedding in HTML
    return base64.b64encode(buf.read()).decode('utf-8')

def generate_pie_chart(safe, fraud):
    labels = ['Safe', 'Fraud']
    sizes = [safe, fraud]
    
    plt.figure(figsize=(6, 6))
    plt.pie(sizes, labels=labels, autopct='%1.1f%%', startangle=140)
    plt.title('Transaction Safety Distribution')
    plt.axis('equal')
    plt.tight_layout()
    
    # Save plot to a bytes buffer
    buf = io.BytesIO()
    plt.savefig(buf, format='png')
    buf.seek(0)
    plt.close()
    
    # Convert to base64 for embedding in HTML
    return base64.b64encode(buf.read()).decode('utf-8')

if __name__ == '__main__':
    app.run(debug=True)