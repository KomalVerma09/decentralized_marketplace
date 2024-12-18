const contractAddress = "0x04e214E756849d32B1C5d4c3027494FaA079bB46";
const tokenAddress = "0xE337AB0f8bDF4cC6C2567dC95286E2E69bcC7FCB";


let web3;
let contract;
let tokenContract;
let productsList = [];
let balanceInWei;
let symbol;


async function switchToBnbTestnet() {
    const bnbTestnet = {
        chainId: 97,
        chainName: "BNB Smart Chain Testnet",
        symbol: "tBNB",
        rpcUrls: "https://data-seed-prebsc-1-s1.binance.org:8545/",
        blockExplorerUrls: "https://testnet.bscscan.com",
    };

    try {
        web3 = new Web3(window.ethereum);
        const currentChainId = await ethereum.request({ method: "eth_chainId" });

        // Check if the current network is not Binance Smart Chain Testnet
        if (currentChainId !== `0x${(bnbTestnet.chainId).toString(16)}`) {
            // Request network switch or add network if it's not already added
            await ethereum.request({
                method: "wallet_addEthereumChain",
                params: [{
                    chainId: `0x${(bnbTestnet.chainId).toString(16)}`,
                    chainName: 'BNB Smart Chain Testnet',
                    rpcUrls: [bnbTestnet.rpcUrls],
                    nativeCurrency: {
                        name: 'tBNB',
                        symbol: bnbTestnet.symbol,
                        decimals: 18,
                    },
                    blockExplorerUrls: [bnbTestnet.blockExplorerUrls],
                }],
            });
            console.log("Successfully switched to Binance Smart Chain Testnet");
        }
    } catch (error) {
        console.error("Error while switching network:", error);
        alert("Failed to switch network. Please switch manually in MetaMask.");
    }
}

window.addEventListener("load", async () => {
    const walletAddressText = document.getElementById("walletAddress");
    const balanceOfAddress = document.getElementById("balanceOfAddress");

    if (window.ethereum) {
        try {
            // Call the separate function to switch the network
            await switchToBnbTestnet();

            web3 = new Web3(window.ethereum);

            // Automatically connect to MetaMask
            const walletAddress = await ethereum.request({ method: "eth_requestAccounts" });
            const currentSelectedAddress = walletAddress[0];
            walletAddressText.innerHTML = currentSelectedAddress;
            console.log("Wallet Address:", currentSelectedAddress);

            // Initialize contracts
            if (!contract) {
                contract = new web3.eth.Contract(contractABI, contractAddress);
                console.log("Contract initialized:", contract);
            }
            if (!tokenContract) {
                tokenContract = new web3.eth.Contract(tokenABI, tokenAddress);
            }

            // Fetch and display balance
            const balance = await tokenContract.methods.balanceOf(currentSelectedAddress).call();
            symbol = await tokenContract.methods.symbol().call();
			balanceInWei = web3.utils.fromWei(balance, "ether");
            balanceOfAddress.innerHTML =  balanceInWei + " " + symbol;

            // Listen for account changes
            window.ethereum.on("accountsChanged", async (newAccount) => {
                const updatedAddress = newAccount[0];
                walletAddressText.innerHTML = updatedAddress || "No account connected";
                console.log("Account changed to:", updatedAddress);

                if (updatedAddress) {
                    const updatedBalance = await tokenContract.methods.balanceOf(updatedAddress).call();
                    balanceOfAddress.innerHTML =
                        web3.utils.fromWei(updatedBalance, "ether") + " " + symbol;
                } else {
                    balanceOfAddress.innerHTML = "0 " + symbol;
                }
            });

            console.log("Connected to MetaMask");

            // Now load the products (ensure this function doesn't fail)
            loadProducts();
        } catch (err) {
            console.error("Error during contract interaction:", err);
            alert("Failed to interact with the contract. Please check your connection or contract interaction.");
        }
    } else {
        alert("Please install MetaMask!");
    }
});

// Function to load products (ensure proper error handling here)
async function loadProducts() {
    try {
        console.log("Loading products...");

        // Sample product loading logic, ensure your contract interaction is correct
        const products = await contract.methods.getProducts().call(); // Assuming a method exists in your contract
        console.log("Products loaded:", products);

        // Process the products here
        // If `products` is an array, you can loop through and display them
    } catch (error) {
        console.error("Failed to load products:", error);
        alert("Failed to load products. Please check your connection or contract interaction.");
    }
}




// Function to load products from the smart contract
async function loadProducts() {
	const productsContainer = document.getElementById("products-container");
	productsContainer.innerHTML = ""; // Clear the container
	productsList = [];
  
	try {
	  const accounts = await web3.eth.getAccounts();
	  const totalNumberOfAddedProduct = await contract.methods.counter().call();
	  console.log("Product count:", totalNumberOfAddedProduct); // Log the product count
  
	  if (Number(totalNumberOfAddedProduct) === 1) {
		console.log("No products found");
		return; 
	  }
  
	  for (let i = 0; i < Number(totalNumberOfAddedProduct) - 1; i++) { 
		const product = await contract.methods.products(i).call();
		console.log("Product details:", product);

		productsList.push(product);
  

		const productId = Number(product.productId);
		const priceInEther = web3.utils.fromWei(product.price.toString(), "ether");
  
		console.log("Product Price (Wei):", product.price);
		console.log("Product Price (Ether):", priceInEther);
  
		// Create a product card for each product and append it to the container
		const productCard = document.createElement("div");
		productCard.className = "product-card";
		productCard.innerHTML = `
		  <h3>${product.title}</h3>
		  <p>${product.desc}</p>
		  <p>Price: ${priceInEther} eBLK</p>
		  <p>Seller: ${product.seller}</p>
		  <p>Buyer: ${
			product.buyer === "0x0000000000000000000000000000000000000000"
			  ? "None"
			  : product.buyer
		  }</p>
		  <p>Delivered: ${product.delivered ? "Yes" : "No"}</p>
		  ${
			product.buyer === "0x0000000000000000000000000000000000000000"
			  ? `<button onclick="buyProduct(${productId})">Buy</button>`
			  : product.buyer.toLowerCase() === accounts[0].toLowerCase() &&
				!product.delivered
			  ? `<button onclick="confirmDelivery(${productId})">Confirm Delivery</button>`
			  : ""
		  }
		`;
		productsContainer.appendChild(productCard);
	  }
	} catch (error) {
	  console.error("Error loading products:", error);
	  alert("Failed to load products. Please check your connection or contract interaction.");
  
	  // Additional debug logs
	  if (error.message.includes("internal JSON-RPC")) {
		console.log("It seems there was an issue with the JSON-RPC provider. Check your RPC endpoint.");
	  } else {
		console.log("Other error:", error.message);
	  }
	}
  }
  
  

// Function to buy a product
async function buyProduct(productId) {
  try {
	// alert(balanceInWei)
	const accounts = await web3.eth.getAccounts();
	const selectedAccount = accounts[0];
	


	const product = productsList.find((p)=>Number(p.productId) === productId );
	const seller = product.seller;

	const manager = await contract.methods.manager().call()

	const productTitle = product.title;
	const productPrice = product.price;

	const priceInEther = web3.utils.fromWei(product.price.toString(), "ether");

	alert(priceInEther);

	if(selectedAccount.toLowerCase() === seller.toLowerCase()){
		alert("You cannot buy your own product...")
		return;		
	}

	if(selectedAccount.toLowerCase()=== manager.toLowerCase()){
		alert("Manager can't buy any product...");
		return;

	}

	if(balanceInWei<priceInEther){
		alert("You don't have enough Ether to buy this product");
		return;
	}

	const approved = await tokenContract.methods.approve(contractAddress,productPrice).send({ from: selectedAccount });

    alert("Approval successful!");

	const allowance = await tokenContract.methods.allowance(selectedAccount, contractAddress).call();

	const allowanceInEther = web3.utils.fromWei(allowance, "ether");
    alert(`Allowance granted: ${allowanceInEther} ETH`);


	const confirmation = confirm("Are you sure you want to buy this?");
    if (!confirmation) return;



    await contract.methods.buy(productId).send({ from: selectedAccount });
    alert(`Product ${productTitle} purchased successfully!`);
    loadProducts(); // Reload products to update the list
  } catch (error) {
    console.error("Error buying product:", error);
    alert("Failed to buy the product. Please check your connection or contract interaction.");
  }
}

// Function to confirm delivery of a product
async function confirmDelivery(productId) {
  try {
	const accounts = await web3.eth.getAccounts();
	const selectedAccount = accounts[0];
	
	const product = productsList.find((p)=>Number(p.productId) === productId );
	const buyer = product.buyer;

	const productTitle = product.title;

	if(selectedAccount!==buyer){
		alert("Only buyer can delivery confirmed!");
		return;
	}

    await contract.methods.delivery(productId).send({ from: accounts[0] });
    alert(`Product ${productTitle} delivered successfully!`);
    loadProducts(); // Reload products to update the list
  } catch (error) {
    console.error("Error confirming delivery:", error);
    alert("Failed to confirm delivery. Please check your connection or contract interaction.");
  }
}

// Function to register a product (called by the seller)
async function registerProduct() {
  const title = document.getElementById("product-title").value;
  const desc = document.getElementById("product-desc").value;
  const price = document.getElementById("product-price").value;

  if (!title || !desc || !price) {
    alert("Please fill in all the fields.");
    return;
  }

  try {
	const accounts = await web3.eth.getAccounts();
	const selectedAccount = accounts[0];
	
	const manager = await contract.methods.manager().call()

	if(selectedAccount.toLowerCase() === manager.toLowerCase()){
		alert("Manager can't add any product");
		return;
	}





    await contract.methods
      .registerItem(title, desc, price)
      .send({ from: accounts[0] });
    alert("Product registered successfully!");
    loadProducts(); // Reload products to update the list
  } catch (error) {
    console.error("Error registering product:", error);
    alert("Failed to register the product. Please check your connection or contract interaction.");
  }
}

