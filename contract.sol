// SPDX-License-Identifier: MIT
pragma solidity >0.8.0;

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
    function allowance(address owner, address spender) external view returns (uint256);
}

contract Ecommerce {
    struct Product {
        string title;
        string desc;
        address payable seller;
        uint productId;
        uint price; 
        address buyer;
        bool delivered;
        bool paidWithToken; 
    }

    uint public counter = 1;
    Product[] public products;
    address payable public manager;
    IERC20 public paymentToken;
    bool isKilled = false;

    modifier isNotKilled {
        require(!isKilled, "Contract does not exist");
        _;
    }

    modifier onlyManager() {
        require(msg.sender == manager, "Only manager can perform this action");
        _;
    }

    event Registered(string title, uint productId, address seller);
    event Bought(uint productId, address buyer, bool paidWithToken);
    event Delivered(uint productId);

    constructor(address _tokenAddress) {
        manager = payable(msg.sender);
        paymentToken = IERC20(_tokenAddress);
    }

    function registerItem(string memory _title, string memory _desc, uint _price) public isNotKilled {
        require(_price > 0, "Price should be greater than zero");
        Product memory tempProduct = Product({
            title: _title,
            desc: _desc,
            seller: payable(msg.sender),
            productId: counter,
            price: _price,
            buyer: address(0),
            delivered: false,
            paidWithToken: false 
        });
        products.push(tempProduct);
        counter++;
        emit Registered(_title, tempProduct.productId, msg.sender);
    }

    function buy(uint _productId, bool _payWithToken) public payable isNotKilled {
        require(_productId > 0 && _productId <= products.length, "Invalid product ID");
        Product storage product = products[_productId - 1];
        require(product.buyer == address(0), "Product already sold");
        require(product.seller != msg.sender, "Seller can't be the buyer");

        if (_payWithToken) {
            // Payment with token
            require(paymentToken.transferFrom(msg.sender, address(this), product.price), "Token payment failed");
            product.paidWithToken = true;
        } else {
            // Payment with native coin (tBNB)
            require(msg.value >= product.price, "Insufficient BNB sent");

            // Refund excess tBNB if sent
            if (msg.value > product.price) {
                payable(msg.sender).transfer(msg.value - product.price);
            }
            product.paidWithToken = false;
        }

        product.buyer = msg.sender;
        emit Bought(_productId, msg.sender, _payWithToken);
    }

    function delivery(uint _productId) public isNotKilled {
        require(_productId > 0 && _productId <= products.length, "Invalid product ID");
        Product storage product = products[_productId - 1];
        require(product.buyer == msg.sender, "Only the buyer can confirm delivery");
        require(!product.delivered, "Product already delivered");

        product.delivered = true;

        uint commission = (product.price * 2) / 100;
        uint sellerAmount = product.price - commission;

        if (product.paidWithToken) {
            // Token-based payment
            require(paymentToken.transfer(manager, commission), "Manager payment failed");
            require(paymentToken.transfer(product.seller, sellerAmount), "Seller payment failed");
        } else {
            // Native coin (tBNB) payment
            require(address(this).balance >= product.price, "Insufficient contract balance for BNB");
            manager.transfer(commission);
            product.seller.transfer(sellerAmount);
        }

        emit Delivered(_productId);
    }

    function transferOwnership(address payable _newManager) public onlyManager {
        require(_newManager != address(0), "Invalid new manager address");
        manager = _newManager;
    }

    function destroy() public onlyManager {
        manager.transfer(address(this).balance);
        isKilled = true;
    }

    fallback() external payable {
        revert("Contract does not accept Ether");
    }

    receive() external payable {
        revert("Contract does not accept Ether");
    }
}
