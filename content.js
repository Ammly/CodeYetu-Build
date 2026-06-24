/* ============================================================================
   CONTENT.JS  —  This is the ONLY file you edit to change or add app options.
   ----------------------------------------------------------------------------
   HOW TO ADD A NEW APP OPTION (e.g. a "Booking" app):
   1. Copy one of the existing entries in PATHS (e.g. tracker) and rename the key.
   2. Change emoji, name, desc, and the `idea` defaults (appname, users, thing...).
   3. Fill `goFurther` with 3 stretch ideas.
   4. Fill `code` with the reference build, broken up per step id. Each step lists
      file operations: { file:'html'|'css'|'js', mode:'replace'|'append', content }.
      Rule that must hold: pasting every step's code in order = a working app.
   5. (Optional) set `seed` — sample data shown only in the live preview.
   That's it. The engine, steps, progress, and preview all adapt automatically.
   ============================================================================ */

window.CONTENT = {

  /* -------- THE SHARED SPINE (same steps for every app option) -------- */
  steps: [
    {
      id: "plan", type: "think", checkpoint: "Ideation",
      title: "Plan your app",
      intro: "Before any code, get clear on who it’s for and what problem it solves. Fill in the “My app” panel above. Every answer drops straight into the AI prompts below, making the app genuinely yours.",
      tasks: [
        "Name your app and who it's for (in the panel above)",
        "Write the one problem it solves",
        "Name the main thing it keeps track of, and its details"
      ],
      reflect: [
        { k: "value", label: "In one sentence, why would your user care about this app?" }
      ]
    },
    {
      id: "setup", type: "setup",
      title: "Set up your workspace",
      intro: "Get your tools ready. You only do this once.",
      tasks: [
        "Open your code editor (VS Code works great)",
        "Make a folder and create 3 empty files: index.html, style.css, app.js",
        "Install Live Server, then right-click index.html → Open with Live Server",
        "Optional: sign in to an AI helper (Copilot or Claude) if you want to build with AI"
      ]
    },
    {
      id: "page", type: "build", file: "index.html",
      title: "Build the page",
      intro: "First the skeleton: a heading, a form to add a {{thing}}, and an empty space where your {{things}} will appear. Get the code below (ask your AI or open the Code tab), then put it in index.html and save.",
      prompt:
"Build a complete index.html file for a web app called \"{{appname}}\".\n" +
"It is for: {{users}}\n" +
"It helps with: {{problem}}\n\n" +
"Requirements:\n" +
"1. Link to style.css in the head, and add <script src=\"app.js\" defer><\/script> at the end of the body.\n" +
"2. A header with an <h1> showing \"{{appname}}\" and a short tagline.\n" +
"3. A form with id=\"add-form\" to add a {{thing}}, with one input for each of these details: {{fields}}. Give every input a clear id and placeholder, and a submit button that says \"Add {{thing}}\".\n" +
"4. An empty container with id=\"list\" where the {{things}} will appear.\n" +
"Output ONLY the complete HTML file.",
      tasks: [
        "Get the code (ask your AI or open the Code tab)",
        "Put it into index.html and save",
        "Check: you see your title, a form, and an Add button (plain is fine)"
      ],
      expect: "A plain, unstyled page with your app name, the input form, and an empty list area.",
      stuck: "Tell your AI: \"Here is my index.html: [paste]. The form/button is missing. Fix only what's broken and show the full file.\""
    },
    {
      id: "style", type: "build", file: "style.css",
      title: "Make it look good",
      intro: "Now give it colour and shape so it feels like a real app on a phone. Get the code, put it in style.css, and save.",
      prompt:
"Create a complete style.css for my \"{{appname}}\" app. Make it clean, friendly and mobile-first.\n" +
"- Centre the content in a column about 600px wide with comfortable padding.\n" +
"- Use one accent colour I can change easily.\n" +
"- Style the header, the add-form (inputs + button), and the list.\n" +
"- Show each {{thing}} as a card: white background, rounded corners, light border, small shadow.\n" +
"- Make the Add button big and easy to tap on a phone.\n" +
"Output ONLY the CSS.",
      tasks: [
        "Get the code (ask your AI or open the Code tab)",
        "Put it into style.css and save",
        "Check: your page now has colour, spacing, and a tidy form"
      ],
      expect: "The same page, now styled: a centred column, a clear form, and a friendly accent colour.",
      stuck: "Ask your AI: \"My style.css isn't applying. Check index.html links it with <link rel='stylesheet' href='style.css'> and the file is in the same folder.\""
    },
    {
      id: "create", type: "build", file: "app.js",
      title: "Add your {{things}}",
      intro: "Now the form actually works. Type something, click Add, and watch it appear. Get the code, put it in app.js, and save.",
      prompt:
"Write app.js for my \"{{appname}}\" app. The page has a form (id=\"add-form\") and an empty container (id=\"list\").\n" +
"1. Keep all {{things}} in an array called items.\n" +
"2. Write render(): clear #list, then for each item build a card showing its details ({{fields}}), with an Edit button and a Delete button that each have a data-index of the item's position.\n" +
"3. On form submit: stop the page reloading, read the input values, push a new object into items, clear the inputs, and call render().\n" +
"4. Call render() once at the bottom.\n" +
"Output ONLY the complete app.js. No TODOs — every function fully written.",
      tasks: [
        "Get the code (ask your AI or open the Code tab)",
        "Put it into app.js and save",
        "Add a few {{things}} and watch them appear in the list"
      ],
      expect: "You can type in the form, click Add, and your {{things}} show up as cards instantly.",
      stuck: "Paste app.js to your AI: \"When I submit nothing appears. Check the form id is 'add-form', list id is 'list', and render() runs after adding.\""
    },
    {
      id: "edit", type: "build", file: "app.js",
      title: "Edit and remove",
      intro: "Real apps let you fix mistakes. Make the Edit and Delete buttons work. Get the code and add it to the bottom of app.js.",
      prompt:
"My app.js for \"{{appname}}\" has an items array, a render() function, and cards with Edit and Delete buttons (each with a data-index). Make those buttons work.\n" +
"1. DELETE: remove that item from items using its data-index, then render().\n" +
"2. EDIT: put that item's details back into the form inputs, remove the old item, so I can re-submit to save changes.\n" +
"3. Use ONE click listener on the #list container (event delegation) so it keeps working after re-rendering.\n" +
"Show only the code to add, and tell me exactly where to paste it.",
      tasks: [
        "Get the code (ask your AI or open the Code tab)",
        "Delete a {{thing}} and watch it disappear",
        "Edit a {{thing}} and watch its details load back into the form"
      ],
      expect: "Each card's Delete removes it; Edit loads it back into the form so you can change and re-add it.",
      stuck: "Tell your AI: \"My Edit/Delete don't react. Use one click listener on #list (event delegation) so it survives re-rendering.\""
    },
    {
      id: "save", type: "build", file: "app.js",
      title: "Save your work",
      intro: "Right now everything vanishes on refresh. Let's make your {{things}} stick around. Get the code and add it to the bottom of app.js.",
      prompt:
"My \"{{appname}}\" app lets me add, edit and delete {{things}}, but everything disappears when I refresh. Make them save.\n" +
"1. After any change to items, save it with localStorage under the key \"{{appname}}-items\" using JSON.stringify.\n" +
"2. When the page loads, read that key back, JSON.parse it into items (empty array if nothing saved), then render().\n" +
"Show only the code to add or change, and where it goes.",
      tasks: [
        "Get the code (ask your AI or open the Code tab)",
        "Add a few {{things}}, then refresh the page",
        "Check: your {{things}} are still there after refresh"
      ],
      expect: "Add some {{things}}, refresh the browser, and they're still there. Saved on the device.",
      stuck: "Ask your AI: \"My data isn't saving. Confirm I save to localStorage after every change and load from the same key when the page opens.\""
    },
    {
      id: "yours", type: "think", checkpoint: "Build",
      title: "Make it yours",
      intro: "You have a working app! Now add ONE feature that makes it genuinely better for your user. Pick an idea below or invent your own, then describe it in plain words to your AI and say which file it goes in.",
      tasks: [
        "Pick one feature to add",
        "Describe it to your AI and add the code",
        "See your new feature working in the app"
      ],
      reflect: [
        { k: "who", label: "Picture one real person using this app. What's the first thing they'd do, and does your app make it easy?" }
      ]
    },
    {
      id: "ship", type: "think", checkpoint: "Finals",
      title: "Share it with the world",
      intro: "Last step: put it online so anyone can open it, and get ready to explain it in 30 seconds.",
      tasks: [
        "Put your folder on GitHub and turn on GitHub Pages (or drop it on Netlify)",
        "Open your public link on a phone to check it works",
        "Write and practise your 30-second pitch"
      ],
      reflect: [
        { k: "grow", label: "If 100 people used this, what would it need next, and how could it keep running (free, a small fee, ads, an organisation)?" },
        { k: "pitch", label: "Your 30-second pitch: \"My app helps ___ to ___, because ___.\"" }
      ]
    }
  ],

  /* -------- THE APP OPTIONS (add more here anytime) -------- */
  paths: {

    tracker: {
      emoji: "📋", name: "Tracker",
      desc: "A list you add to, tick off and manage. The simplest start.",
      idea: { appname: "MyTracker", users: "", problem: "", thing: "task", things: "tasks", fields: "a title" },
      goFurther: ["Add a “done” checkbox and grey out finished tasks", "Add a due date and sort by it", "Add a filter: all / done / not done"],
      seed: "items=[{title:'Buy maize flour'},{title:'Finish maths homework'}];render();",
      code: {
        page: [{ file: "html", mode: "replace", label: "index.html", content:
"<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>My Tracker</title>\n  <link rel=\"stylesheet\" href=\"style.css\">\n</head>\n<body>\n  <header>\n    <h1>My Tracker</h1>\n    <p>Keep track of what matters.</p>\n  </header>\n  <form id=\"add-form\">\n    <input id=\"title\" type=\"text\" placeholder=\"Add a task...\">\n    <button type=\"submit\">Add task</button>\n  </form>\n  <div id=\"list\"></div>\n  <script src=\"app.js\" defer><\/script>\n</body>\n</html>" }],
        style: [{ file: "css", mode: "replace", label: "style.css", content:
"* { box-sizing: border-box; margin: 0; padding: 0; }\nbody {\n  font-family: system-ui, sans-serif;\n  background: #f4f7f5; color: #1a2620;\n  max-width: 600px; margin: 0 auto; padding: 24px 16px;\n}\nheader { margin-bottom: 20px; }\nh1 { font-size: 26px; }\nheader p { color: #5c6b63; margin-top: 4px; }\n#add-form { display: flex; gap: 8px; margin-bottom: 18px; }\n#add-form input {\n  flex: 1; padding: 12px 14px; font-size: 16px;\n  border: 1.5px solid #d8e2dc; border-radius: 10px;\n}\n#add-form button {\n  padding: 12px 18px; font-size: 16px; font-weight: 600;\n  background: #00A651; color: #fff; border: none;\n  border-radius: 10px; cursor: pointer;\n}\n.card {\n  display: flex; justify-content: space-between; align-items: center;\n  background: #fff; border: 1px solid #e3ece7; border-radius: 12px;\n  padding: 14px 16px; margin-bottom: 10px;\n  box-shadow: 0 1px 3px rgba(0,0,0,.05);\n}\n.card-actions button {\n  border: none; background: none; cursor: pointer;\n  font-size: 14px; margin-left: 10px; color: #5c6b63;\n}\n.card-actions .delete { color: #E31937; }" }],
        create: [{ file: "js", mode: "replace", label: "app.js", content:
"// --- where we keep the tasks ---\nlet items = [];\n\n// --- show every task on the page ---\nfunction render() {\n  const list = document.getElementById('list');\n  list.innerHTML = '';\n  items.forEach(function (item, index) {\n    const card = document.createElement('div');\n    card.className = 'card';\n    card.innerHTML =\n      '<span class=\"card-text\">' + item.title + '</span>' +\n      '<span class=\"card-actions\">' +\n        '<button class=\"edit\" data-index=\"' + index + '\">Edit</button>' +\n        '<button class=\"delete\" data-index=\"' + index + '\">Delete</button>' +\n      '</span>';\n    list.appendChild(card);\n  });\n}\n\n// --- add a new task when the form is sent ---\ndocument.getElementById('add-form').addEventListener('submit', function (e) {\n  e.preventDefault();\n  const input = document.getElementById('title');\n  const value = input.value.trim();\n  if (!value) return;\n  items.push({ title: value });\n  input.value = '';\n  if (typeof save === 'function') save();\n  render();\n});\n\n// --- start empty but ready ---\nrender();" }],
        edit: [{ file: "js", mode: "append", label: "app.js  (add to the bottom)", content:
"\n\n// --- edit and delete (one listener that survives re-rendering) ---\ndocument.getElementById('list').addEventListener('click', function (e) {\n  const index = e.target.dataset.index;\n  if (index === undefined) return;\n  if (e.target.classList.contains('delete')) {\n    items.splice(index, 1);\n    if (typeof save === 'function') save();\n    render();\n  }\n  if (e.target.classList.contains('edit')) {\n    document.getElementById('title').value = items[index].title;\n    items.splice(index, 1);\n    if (typeof save === 'function') save();\n    render();\n  }\n});" }],
        save: [{ file: "js", mode: "append", label: "app.js  (add to the bottom)", content:
"\n\n// --- save so tasks stay after a refresh ---\nfunction save() {\n  try { localStorage.setItem('MyTracker-items', JSON.stringify(items)); } catch (e) {}\n}\nfunction load() {\n  try {\n    const data = localStorage.getItem('MyTracker-items');\n    if (data) items = JSON.parse(data);\n  } catch (e) {}\n}\nload();\nrender();" }]
      }
    },

    shop: {
      "emoji": "🛒",
      "name": "Shop",
      "desc": "A real shopping flow: stock products, add to cart, check out.",
      "idea": {
            "appname": "MyShop",
            "users": "",
            "problem": "",
            "thing": "product",
            "things": "products",
            "fields": "a name and a price in KES"
      },
      "goFurther": [
            "Add a quantity stepper and multiply price by quantity",
            "Add product categories and a filter",
            "Send the order to the seller as a WhatsApp message link"
      ],
      "seed": "products=[{name:'Sukuma wiki bunch',price:'20'},{name:'Tomatoes 1kg',price:'120'},{name:'Maize flour 2kg',price:'150'}];renderProducts();",
      "stepOverrides": {
            "page": {
                  "intro": "First the shape of your shop: a form for you (the seller) to add products, a Products area to list them, and a Cart panel with a Checkout button for your customer.",
                  "tasks": [
                        "Paste the prompt / copy the code into index.html",
                        "Save and view it",
                        "Check: you see an add-product form, an empty Products area, and a Cart panel"
                  ],
                  "expect": "A plain shop page: an add-product form, an empty Products list, and a Cart panel with a Checkout button.",
                  "prompt": "Build a complete index.html for an online shop called \"{{appname}}\".\nIt is for: {{users}}\nIt helps with: {{problem}}\n\nThe page has these parts:\n1. A header with an <h1> \"{{appname}}\" and a short tagline.\n2. A seller section: a form id=\"add-form\" with an input id=\"name\" (text), an input id=\"price\" (number), and a submit button \"Add product\".\n3. A shop section: a heading \"Products\" and an empty <div id=\"list\"></div>.\n4. A cart panel: a heading \"Your cart\", an empty <div id=\"cart\"></div>, a total line <div id=\"cart-total\">Total: KES 0</div>, a <button id=\"checkout\">Checkout</button>, and an empty <div id=\"order-msg\"></div>.\nLink style.css in the head and add <script src=\"app.js\" defer><\/script> before </body>.\nOutput ONLY the HTML file."
            },
            "style": {
                  "intro": "Make it look like a real shop: product cards with prices and an Add-to-cart button, and a clear cart panel.",
                  "tasks": [
                        "Paste the prompt / copy the code into style.css",
                        "Save",
                        "Check: product cards and the cart panel look tidy on a phone"
                  ],
                  "expect": "A styled shop: product cards with bold prices and Add-to-cart buttons, and a neat cart panel with a Checkout button.",
                  "prompt": "Create a complete style.css for my online shop \"{{appname}}\". Mobile-first and friendly.\n- Centre the page in a column about 600px wide.\n- Style the add-product form (inputs + button).\n- Show each product as a card with its name, a bold price, and an \"Add to cart\" button.\n- Style the cart panel: each cart row with a remove button, a bold total, and a big full-width Checkout button.\nUse one accent colour. Output ONLY the CSS."
            },
            "create": {
                  "title": "Stock your shop",
                  "intro": "Now the seller can add products, and each one appears in the catalogue with an \"Add to cart\" button. Paste the prompt / copy the code into app.js and save.",
                  "tasks": [
                        "Paste the prompt / copy the code into app.js",
                        "Add a few products",
                        "Check: each product shows its price and an Add to cart button"
                  ],
                  "expect": "You add products and they appear in the catalogue, each with its price and an \"Add to cart\" button.",
                  "prompt": "Write app.js for my shop \"{{appname}}\". The page has a form (id=\"add-form\", inputs id=\"name\" and id=\"price\") and an empty <div id=\"list\">.\n1. Keep products in an array called products.\n2. renderProducts(): clear #list, then for each product build a card showing its name and price in KES, plus an \"Add to cart\" button with a data-add attribute set to the product's index.\n3. On form submit: stop the page reloading, read name and price, push { name, price } into products, clear the inputs, and call renderProducts().\n4. Call renderProducts() once at the bottom.\nOutput ONLY the complete app.js."
            },
            "edit": {
                  "title": "Add to cart",
                  "intro": "Time to shop! Make \"Add to cart\" work. Clicking it puts the product in the cart, the cart shows a running total, and the customer can remove items.",
                  "tasks": [
                        "Add the cart code to app.js (at the bottom)",
                        "Click Add to cart on a product",
                        "Check: it appears in the cart, the total updates, and remove (✕) works"
                  ],
                  "expect": "Clicking Add to cart adds the product to the cart with a running KES total; the ✕ removes it.",
                  "prompt": "My shop app.js has a products array, renderProducts(), and each product card has an \"Add to cart\" button with a data-add attribute. Add a shopping cart.\n1. Keep cart items in an array called cart.\n2. renderCart(): clear #cart, list each cart item (name + price) with a remove button (data-remove = its index), add up the prices, and show \"Total: KES X\" in #cart-total.\n3. Click on #list: if an Add-to-cart button was clicked (it has data-add), push products[that index] into cart and call renderCart().\n4. Click on #cart: if a remove button was clicked (data-remove), remove that item and call renderCart().\n5. Use event delegation so it keeps working after re-rendering. Call renderCart() once.\nShow the code to add and where it goes.",
                  "stuck": "Tell your AI: \"Add to cart does nothing. Put ONE click listener on #list, read e.target.dataset.add, push products[that index] into cart, then renderCart().\""
            },
            "save": {
                  "title": "Checkout & save",
                  "intro": "Finish the flow: a Checkout button that places the order and shows the total, plus saving so your products stay after a refresh.",
                  "tasks": [
                        "Add the checkout + save code to app.js (at the bottom)",
                        "Add products, then refresh and check they're still there",
                        "Add items to the cart and click Checkout to see the order total"
                  ],
                  "expect": "Checkout shows \"✅ Order placed! total KES X\" and clears the cart; your products stay after refresh.",
                  "prompt": "My shop app.js has products, a cart, renderProducts() and renderCart(). Add saving and checkout.\n1. SAVE: after any change to products, save it to localStorage under \"{{appname}}-products\". On page load, read it back into products and call renderProducts().\n2. CHECKOUT: when #checkout is clicked, if the cart is empty show \"Your cart is empty.\" in #order-msg. Otherwise add up the cart total and show \"Order placed! N item(s), total KES X.\" in #order-msg, then empty the cart and call renderCart().\nShow the code to add and where it goes."
            }
      },
      "code": {
            "page": [
                  {
                        "file": "html",
                        "mode": "replace",
                        "label": "index.html",
                        "content": "<!DOCTYPE html>\n<html lang=\"en\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>My Shop</title>\n  <link rel=\"stylesheet\" href=\"style.css\">\n</head>\n<body>\n  <header>\n    <h1>My Shop</h1>\n    <p>Sell to your community.</p>\n  </header>\n\n  <section class=\"seller\">\n    <h2>Add a product</h2>\n    <form id=\"add-form\">\n      <input id=\"name\" type=\"text\" placeholder=\"Product name\">\n      <input id=\"price\" type=\"number\" placeholder=\"Price (KES)\">\n      <button type=\"submit\">Add product</button>\n    </form>\n  </section>\n\n  <section class=\"shop\">\n    <h2>Products</h2>\n    <div id=\"list\"></div>\n  </section>\n\n  <aside id=\"cart-panel\">\n    <h2>Your cart</h2>\n    <div id=\"cart\"></div>\n    <div id=\"cart-total\">Total: KES 0</div>\n    <button id=\"checkout\">Checkout</button>\n    <div id=\"order-msg\"></div>\n  </aside>\n\n  <script src=\"app.js\" defer><\/script>\n</body>\n</html>"
                  }
            ],
            "style": [
                  {
                        "file": "css",
                        "mode": "replace",
                        "label": "style.css",
                        "content": "* { box-sizing: border-box; margin: 0; padding: 0; }\nbody {\n  font-family: system-ui, sans-serif;\n  background: #f4f7f5; color: #1a2620;\n  max-width: 600px; margin: 0 auto; padding: 24px 16px;\n}\nheader { margin-bottom: 14px; }\nh1 { font-size: 26px; }\nheader p { color: #5c6b63; margin-top: 4px; }\nh2 { font-size: 16px; margin: 18px 0 10px; }\n#add-form { display: flex; flex-wrap: wrap; gap: 8px; }\n#add-form input {\n  flex: 1; min-width: 120px; padding: 12px 14px; font-size: 16px;\n  border: 1.5px solid #d8e2dc; border-radius: 10px;\n}\n#add-form button {\n  padding: 12px 18px; font-size: 16px; font-weight: 600;\n  background: #00A651; color: #fff; border: none; border-radius: 10px; cursor: pointer;\n}\n.card {\n  display: flex; justify-content: space-between; align-items: center;\n  background: #fff; border: 1px solid #e3ece7; border-radius: 12px;\n  padding: 14px 16px; margin-bottom: 10px; box-shadow: 0 1px 3px rgba(0,0,0,.05);\n}\n.price { font-weight: 700; color: #00753a; }\n.add-cart {\n  border: none; background: #e7f6ee; color: #00753a; font-weight: 600;\n  padding: 8px 12px; border-radius: 8px; cursor: pointer;\n}\n#cart-panel {\n  background: #fff; border: 1px solid #e3ece7; border-radius: 14px;\n  padding: 16px; margin-top: 18px; box-shadow: 0 1px 3px rgba(0,0,0,.05);\n}\n.cart-row {\n  display: flex; justify-content: space-between; align-items: center;\n  padding: 8px 0; border-bottom: 1px solid #f0f4f2; font-size: 14px;\n}\n.remove { border: none; background: none; color: #E31937; cursor: pointer; font-size: 16px; }\n#cart-total { font-weight: 700; margin: 12px 0; }\n#checkout {\n  width: 100%; padding: 13px; font-size: 16px; font-weight: 600;\n  background: #00A651; color: #fff; border: none; border-radius: 10px; cursor: pointer;\n}\n#order-msg { margin-top: 10px; color: #00753a; font-weight: 600; }"
                  }
            ],
            "create": [
                  {
                        "file": "js",
                        "mode": "replace",
                        "label": "app.js",
                        "content": "// --- the products in your shop ---\nlet products = [];\n\n// --- show the product catalogue ---\nfunction renderProducts() {\n  const list = document.getElementById('list');\n  list.innerHTML = '';\n  products.forEach(function (p, index) {\n    const card = document.createElement('div');\n    card.className = 'card';\n    card.innerHTML =\n      '<span class=\"card-text\">' + p.name + ' <span class=\"price\">KES ' + p.price + '</span></span>' +\n      '<button class=\"add-cart\" data-add=\"' + index + '\">Add to cart</button>';\n    list.appendChild(card);\n  });\n}\n\n// --- the seller adds a product ---\ndocument.getElementById('add-form').addEventListener('submit', function (e) {\n  e.preventDefault();\n  const name = document.getElementById('name').value.trim();\n  const price = document.getElementById('price').value.trim();\n  if (!name || !price) return;\n  products.push({ name: name, price: price });\n  document.getElementById('name').value = '';\n  document.getElementById('price').value = '';\n  if (typeof save === 'function') save();\n  renderProducts();\n});\n\n// --- start the shop ---\nrenderProducts();"
                  }
            ],
            "edit": [
                  {
                        "file": "js",
                        "mode": "append",
                        "label": "app.js  (add to the bottom)",
                        "content": "\n\n// --- the shopping cart ---\nlet cart = [];\n\nfunction renderCart() {\n  const cartEl = document.getElementById('cart');\n  cartEl.innerHTML = '';\n  let total = 0;\n  cart.forEach(function (item, index) {\n    total += Number(item.price);\n    const row = document.createElement('div');\n    row.className = 'cart-row';\n    row.innerHTML =\n      '<span>' + item.name + ' — KES ' + item.price + '</span>' +\n      '<button class=\"remove\" data-remove=\"' + index + '\">✕</button>';\n    cartEl.appendChild(row);\n  });\n  document.getElementById('cart-total').textContent = 'Total: KES ' + total;\n}\n\n// click a product's \"Add to cart\" button\ndocument.getElementById('list').addEventListener('click', function (e) {\n  const i = e.target.dataset.add;\n  if (i === undefined) return;\n  cart.push(products[i]);\n  renderCart();\n});\n\n// click the ✕ to remove a cart item\ndocument.getElementById('cart').addEventListener('click', function (e) {\n  const i = e.target.dataset.remove;\n  if (i === undefined) return;\n  cart.splice(i, 1);\n  renderCart();\n});\n\nrenderCart();"
                  }
            ],
            "save": [
                  {
                        "file": "js",
                        "mode": "append",
                        "label": "app.js  (add to the bottom)",
                        "content": "\n\n// --- save the shop's products so they stay after a refresh ---\nfunction save() {\n  try { localStorage.setItem('MyShop-products', JSON.stringify(products)); } catch (e) {}\n}\nfunction load() {\n  try {\n    const data = localStorage.getItem('MyShop-products');\n    if (data) products = JSON.parse(data);\n  } catch (e) {}\n}\nload();\nrenderProducts();\n\n// --- checkout: place the order ---\ndocument.getElementById('checkout').addEventListener('click', function () {\n  if (cart.length === 0) {\n    document.getElementById('order-msg').textContent = 'Your cart is empty.';\n    return;\n  }\n  let total = 0;\n  cart.forEach(function (item) { total += Number(item.price); });\n  document.getElementById('order-msg').textContent =\n    '✅ Order placed! ' + cart.length + ' item(s), total KES ' + total + '.';\n  cart = [];\n  renderCart();\n});"
                  }
            ]
      }
},

    custom: {
      emoji: "🎨", name: "Your own idea",
      desc: "You name the thing and its details. Same steps, your product.",
      idea: { appname: "", users: "", problem: "", thing: "", things: "", fields: "" },
      goFurther: ["Add a second detail or a category to each item", "Add a search box that filters as you type", "Add a way to mark favourites or important items"],
      seed: "",
      /* The custom path reuses the Tracker reference build as its safety net,
         filled in automatically by the engine if the kid reveals code. */
      code: "tracker"
    }

  }
};

