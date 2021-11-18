let db;
let budget;

// Create a new db request for a "budget" database.
const request = indexedDB.open('budget', budget || 30);

request.onupgradeneeded = function (e) {
  console.log('Upgrade needed in IndexDB');

  const { oldVersion } = e;
  const newVersion = e.newVersion || db.version;

  console.log(`DB Updated from version ${oldVersion} to ${newVersion}`);

  db = e.target.result;

  if (db.objectStoreNames.length === 0) {
    db.createObjectStore('budget', { autoIncrement: true });
  }
};

request.onerror = function (e) {
  console.log(`Error! ${e.target.errorCode}`);
};

function checkDatabase() {
  console.log('check db invoked');

  // Opens a transaction on budget db
  let transaction = db.transaction(['budget'], 'readwrite');

  // access your budget object
  const store = transaction.objectStore('budget');

  // Get all records from store and set to a variable
  const getAll = store.getAll();

  // If the request was successful
  getAll.onsuccess = function () {
    // If there are items, we need to bulk add them when we are back online
    if (getAll.result.length > 0) {
      fetch('/api/transaction/bulk', {
        method: 'POST',
        body: JSON.stringify(getAll.result),
        headers: {
          Accept: 'application/json, text/plain, */*',
          'Content-Type': 'application/json',
        },
      })
        .then((response) => response.json())
        .then((res) => {
          // If our returned response is not empty
          if (res.length !== 0) {
            // Open another transaction to BudgetStore with the ability to read and write
            transaction = db.transaction(['budget'], 'readwrite');

            // Assign the current store to a variable
            const currentStore = transaction.objectStore('budget');

            // Clear existing entries because our bulk add was successful
            currentStore.clear();
            console.log('Clearing');
          }
        });
    }
  };
}

request.onsuccess = function (e) {
  console.log('success');
  db = e.target.result;

  // Check if app is online before reading from db
  if (navigator.onLine) {
    console.log('Backend online! 🗄️');
    checkDatabase();
  }
};

const saveRecord = (record) => {
  console.log('Save record invoked');
  // Create a transaction on the budget db with readwrite access
  const transaction = db.transaction(['budget'], 'readwrite');

  // Access your budget object store
  const store = transaction.objectStore('budget');

  // Add record to your store with add method.
  store.add(record);
};

// Listen for app coming back online
window.addEventListener('online', checkDatabase);