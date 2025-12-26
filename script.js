console.log("Dashboard loaded");
// UNIFORM COMPLIANCE OVER TIME (LINE CHART)
new Chart(document.getElementById('complianceChart'), {
  type: 'line',
  data: {
    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
    datasets: [
      {
        label: 'Proper Uniform',
        data: [220, 240, 260, 280, 300],
        borderWidth: 3,
        tension: 0.4
      },
      {
        label: 'Violations',
        data: [45, 38, 30, 25, 20],
        borderWidth: 3,
        tension: 0.4
      }
    ]
  }
});

// UNIFORM VIOLATION TYPES (BAR CHART)
new Chart(document.getElementById('violationChart'), {
  type: 'bar',
  data: {
    labels: [
      'Incomplete Uniform',
      'No ID ',
      'Jacket / Hoodie',
      'Wrong Uniform'
    ],
    datasets: [{
      label: 'Number of Violations',
      data: [60, 35, 25, 17]
    }]
  }
});

// ATTENDANCE VS VIOLATIONS (BAR CHART)
new Chart(document.getElementById('attendanceChart'), {
  type: 'bar',
  data: {
    labels: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    datasets: [
      {
        label: 'Attendance',
        data: [320, 330, 340, 350, 360]
      },
      {
        label: 'Violations',
        data: [45, 38, 30, 25, 20]
      }
    ]
  }
});

