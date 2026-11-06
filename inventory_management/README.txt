INVENTORY MANAGEMENT SYSTEM - SETUP GUIDE
==========================================

TECHNOLOGIES
- Frontend: HTML, CSS, JavaScript
- Backend: Node.js and Express
- Database: MySQL

PROJECT FILES
inventory_management/
  public/
    dashboard.html
    products.html
    suppliers.html
    transactions.html
    css/style.css
    js/app.js
  server/
    server.js
    db.js
  database.sql
  package.json
  .env.example
  .gitignore
  README.txt

IMPORTANT
All frontend CSS is in ONE file: public/css/style.css
All frontend JavaScript is in ONE file: public/js/app.js
Backend JavaScript is in server/server.js and server/db.js.

STEP 1 - CREATE THE DATABASE
1. Open MySQL Workbench.
2. Open database.sql from this project.
3. Execute the script.
This creates the database and three tables:
- products
- suppliers
- stock_transactions

If you already created these tables with different columns, back up your data
and compare the schema before running the script. Do not drop existing tables.

STEP 2 - SET YOUR MYSQL PASSWORD
1. In the project folder, copy .env.example and rename the copy to .env.
2. Open .env.
3. Replace YOUR_MYSQL_PASSWORD with your actual MySQL root password.
4. Save the file.
If your MySQL root account has no password, leave DB_PASSWORD= empty.

STEP 3 - INSTALL NODE PACKAGES
Open the project folder in VS Code.
Open Terminal > New Terminal and run:

npm.cmd install

(Use npm install if your terminal allows it.)

STEP 4 - START THE SERVER
Run:

node server/server.js

You should see:
Server running at http://localhost:3000

Keep this terminal open while using the website.

STEP 5 - OPEN THE WEBSITE
Open this address in your browser:

http://localhost:3000

The dashboard should appear. Use the sidebar to open Products, Suppliers
and Transactions.

STEP 6 - TEST THE DATABASE CONNECTION
Open:

http://localhost:3000/api/test-db

A successful response looks similar to:
{"success":true,"message":"MySQL connected successfully!","database":"inventory_management"}

HOW STOCK TRANSACTIONS WORK
- Purchase increases the selected product's quantity.
- Sale decreases the selected product's quantity.
- A sale cannot be saved if there is not enough stock.
- Transactions keep references to products and suppliers. Therefore a product
  or supplier already used in a transaction cannot be deleted. This protects
  transaction history.

TROUBLESHOOTING
1. "Access denied for user":
   Check DB_USER and DB_PASSWORD in .env.

2. "Unknown database":
   Execute database.sql in MySQL Workbench.

3. "Table doesn't exist":
   Make sure the database.sql script was executed in the inventory_management
   database.

4. "Port 3000 already in use":
   Stop the other server, or change PORT in .env.

5. PowerShell says npm.ps1 cannot be loaded:
   Use npm.cmd install instead of npm install.

6. A transaction dropdown is empty:
   Add at least one product and one supplier before recording a transaction.

Do not share your .env file or database password.
