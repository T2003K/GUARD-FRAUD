document.addEventListener('DOMContentLoaded', function() {
    // Single Transaction Form Submission
    const singleTransactionForm = document.getElementById('singleTransactionForm');
    if (singleTransactionForm) {
        singleTransactionForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const merchantId = document.getElementById('merchant_id').value.trim();
            const amount = document.getElementById('amount').value;
            
            // Basic validation
            if (!merchantId || !amount) {
                showResult('Please enter both Merchant ID and Amount', 'error');
                return;
            }
            
            fetch('/predict_single', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `merchant_id=${encodeURIComponent(merchantId)}&amount=${encodeURIComponent(amount)}`
            })
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
                if (data.result.includes('Fraud')) {
                    showResult(data.result, 'fraud');
                } else if (data.result.includes('Safe')) {
                    showResult(data.result, 'safe');
                } else {
                    showResult(data.result, 'neutral');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showResult('An error occurred. Please try again.', 'error');
            });
        });
    }

    // Transaction Range Form Submission
    const rangeAnalysisForm = document.getElementById('rangeAnalysisForm');
    if (rangeAnalysisForm) {
        rangeAnalysisForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const startDate = document.getElementById('start_date').value;
            const endDate = document.getElementById('end_date').value;
            
            // Basic validation
            if (!startDate || !endDate) {
                alert('Please select both start and end dates');
                return;
            }
            
            if (new Date(startDate) > new Date(endDate)) {
                alert('Start date must be before end date');
                return;
            }
            
            // Show loading state
            const analyzeBtn = rangeAnalysisForm.querySelector('button[type="submit"]');
            analyzeBtn.disabled = true;
            analyzeBtn.textContent = 'Analyzing...';
            
            fetch('/analyze_range', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                },
                body: `start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`
            })
            .then(response => {
                if (!response.ok) throw new Error('Network response was not ok');
                return response.json();
            })
            .then(data => {
                // Reset button state
                analyzeBtn.disabled = false;
                analyzeBtn.textContent = 'Analyze';
                
                if (data.error) {
                    let errorMsg = data.error;
                    if (data.debug_info) {
                        errorMsg += `\n\n${data.debug_info}`;
                    }
                    alert(errorMsg);
                    return;
                }
                
                // Update statistics
                updateStats(data);
                
                // Update sample data tables
                updateTransactionTable('firstTwoTable', data.first_two);
                updateTransactionTable('lastTwoTable', data.last_two);
                
                // Update charts
                updateChart('lineChart', data.line_chart);
                updateChart('pieChart', data.pie_chart);
                
                // Show all sections
                showSections(true);
            })
            .catch(error => {
                console.error('Error:', error);
                analyzeBtn.disabled = false;
                analyzeBtn.textContent = 'Analyze';
                alert('An error occurred while processing your request.');
            });
        });
    }
});

// Helper Functions

function showResult(message, type) {
    const resultBox = document.getElementById('result');
    resultBox.textContent = message;
    resultBox.className = 'result-box'; // Reset classes
    
    switch (type) {
        case 'fraud':
            resultBox.classList.add('fraud-result');
            break;
        case 'safe':
            resultBox.classList.add('safe-result');
            break;
        case 'error':
            resultBox.classList.add('error-result');
            break;
        default:
            resultBox.classList.add('neutral-result');
    }
}

function updateStats(data) {
    const statsContent = document.getElementById('statsContent');
    statsContent.innerHTML = `
        <p><strong>Total Transactions:</strong> ${data.total_transactions}</p>
        <p><strong>Fraudulent Transactions:</strong> ${data.fraud_transactions}</p>
        <p><strong>Detection Accuracy:</strong> ${data.accuracy}%</p>
    `;
}

function updateTransactionTable(tableId, data) {
    const tableBody = document.querySelector(`#${tableId} tbody`);
    tableBody.innerHTML = '';
    
    data.forEach(transaction => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${transaction.Merchant_id || 'N/A'}</td>
            <td>${transaction.first || 'N/A'}</td>
            <td>${transaction.last || 'N/A'}</td>
            <td>${transaction.Transaction_amount?.toFixed(2) || '0.00'}</td>
            <td class="${transaction.isFradulent === 'Y' ? 'fraud-status' : 'safe-status'}">
                ${transaction.isFradulent === 'Y' ? 'Fraud' : 'Safe'}
            </td>
        `;
        tableBody.appendChild(row);
    });
}

function updateChart(chartId, base64Data) {
    const chartElement = document.getElementById(chartId);
    if (base64Data) {
        chartElement.src = `data:image/png;base64,${base64Data}`;
        chartElement.style.display = 'block';
    } else {
        chartElement.style.display = 'none';
    }
}

function showSections(show) {
    const sections = [
        'stats',
        'sampleData',
        'charts'
    ];
    
    sections.forEach(sectionId => {
        const element = document.getElementById(sectionId);
        if (element) {
            if (show) {
                element.classList.remove('hidden');
            } else {
                element.classList.add('hidden');
            }
        }
    });
}