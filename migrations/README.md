# SellerStock Schema Migration

This migration separates the embedded `sellerStocks` array from the Product model into a dedicated `SellerStock` collection for better data normalization and performance.

## What Changed

### Before (Embedded Array)
```javascript
// Product model had embedded sellerStocks array
{
  _id: "product_id",
  name: "Product Name",
  sellerStocks: [
    {
      sellerId: "seller_id_1",
      quantity: 10
    },
    {
      sellerId: "seller_id_2", 
      quantity: 5
    }
  ]
}
```

### After (Separate Collection)
```javascript
// Product model (clean)
{
  _id: "product_id",
  name: "Product Name",
  assignedSellers: ["seller_id_1", "seller_id_2"]
}

// SellerStock collection (separate documents)
{
  _id: "stock_id_1",
  seller: "seller_id_1",
  product: "product_id", 
  quantity: 10,
  lastTransferDate: "2023-12-01T10:00:00Z"
}
{
  _id: "stock_id_2", 
  seller: "seller_id_2",
  product: "product_id",
  quantity: 5,
  lastTransferDate: "2023-12-01T11:00:00Z"
}
```

## Benefits

1. **Better Normalization**: Follows database normalization principles
2. **Improved Performance**: Separate indexes and queries
3. **Scalability**: No document size limits from embedded arrays
4. **Data Integrity**: Unique constraints on seller-product combinations
5. **Better Querying**: Efficient queries by seller or product
6. **Audit Trail**: Timestamps for transfers

## SellerStock Model Features

### Schema Fields
- `seller`: Reference to User (seller)
- `product`: Reference to Product
- `quantity`: Stock quantity (min: 0)
- `lastTransferDate`: Date of last stock change
- `createdAt`: Auto-generated creation timestamp
- `updatedAt`: Auto-generated update timestamp

### Indexes
- Compound unique index: `{seller: 1, product: 1}`
- Single indexes: `seller`, `product`

### Static Methods
```javascript
// Find stock by seller and product
SellerStock.findBySellerAndProduct(sellerId, productId)

// Get all stocks for a seller
SellerStock.findBySeller(sellerId) 

// Get all stocks for a product
SellerStock.findByProduct(productId)
```

### Instance Methods
```javascript
// Update quantity safely
stock.updateQuantity(changeAmount)
```

## Migration Process

### 1. Run Migration
```bash
cd migrations
node migrate_seller_stocks.js migrate
```

### 2. Validate Migration
```bash
node migrate_seller_stocks.js validate
```

### 3. Emergency Rollback (if needed)
```bash
node migrate_seller_stocks.js rollback
```

## Code Changes Made

### Routes Updated
- `routes/admin.js` - Product assignment logic
- `routes/sales.js` - Stock checking and updates  
- `routes/transfers.js` - Transfer operations
- `routes/analytics.js` - Stock value calculations
- `routes/seller.js` - Seller stock viewing

### New API Endpoints

#### Admin Endpoints
- `GET /admin/seller-stocks` - List all seller stocks
- `GET /admin/sellers/:sellerId/stocks` - Seller's stocks
- `GET /admin/products/:productId/stocks` - Product's stocks
- `PATCH /admin/seller-stocks/:stockId` - Update stock quantity
- `DELETE /admin/seller-stocks/:stockId` - Remove seller stock

#### Seller Endpoints  
- `GET /seller/stocks` - View own stocks with summary
- `GET /seller/stocks/product/:productId` - View stock for specific product

## Usage Examples

### Assign Product to Seller
```javascript
// In admin routes
const existingStock = await SellerStock.findBySellerAndProduct(sellerId, productId);

if (existingStock) {
  await existingStock.updateQuantity(quantity);
} else {
  await SellerStock.create({
    seller: sellerId,
    product: productId, 
    quantity: quantity
  });
}
```

### Check Stock Before Sale
```javascript
// In sales routes
const sellerStock = await SellerStock.findBySellerAndProduct(userId, productId);

if (!sellerStock || sellerStock.quantity < requestedQuantity) {
  return res.status(400).json({ error: "Insufficient stock" });
}

// Update stock
await sellerStock.updateQuantity(-requestedQuantity);
```

### Get Seller Analytics
```javascript
// Get all stocks for analytics
const sellerStocks = await SellerStock.find()
  .populate('seller', 'username firstName lastName')
  .populate('product', 'name costPrice');

const totalValue = sellerStocks.reduce((sum, stock) => {
  return sum + (stock.quantity * stock.product.costPrice);
}, 0);
```

## Migration Safety

### Before Migration
1. **Backup Database**: Create full database backup
2. **Test Environment**: Run migration on copy first
3. **Downtime Planning**: Schedule maintenance window

### During Migration
- Migration runs in transactions where possible
- Detailed logging of all operations
- Error handling for individual records
- Progress tracking

### After Migration
- Validation checks for data integrity
- Performance monitoring
- Rollback plan if issues arise

## Troubleshooting

### Common Issues

1. **Duplicate Stock Records**
   ```bash
   # Check for duplicates
   node migrate_seller_stocks.js validate
   ```

2. **Missing Stocks After Migration**
   - Check migration logs
   - Verify original data had valid seller IDs
   - Run validation script

3. **Performance Issues**
   - Ensure indexes are created
   - Check query patterns in new routes

### Recovery Steps

1. **If migration fails partway**:
   - Check logs for last successful product
   - Fix data issues
   - Re-run migration (it handles duplicates)

2. **If rollback needed**:
   ```bash
   node migrate_seller_stocks.js rollback
   ```

3. **Manual cleanup**:
   ```javascript
   // Remove all SellerStock records
   await SellerStock.deleteMany({});
   
   // Remove sellerStocks field from all products
   await Product.updateMany({}, { $unset: { sellerStocks: 1 } });
   ```

## Testing

### Test Migration
```javascript
// Create test data
const product = await Product.create({
  name: "Test Product",
  sellerStocks: [
    { sellerId: "seller1", quantity: 10 },
    { sellerId: "seller2", quantity: 5 }
  ]
});

// Run migration
await migrateSellerStocks();

// Verify results
const stocks = await SellerStock.find({ product: product._id });
console.log(stocks); // Should show 2 separate records
```

### Test New Routes
```bash
# Test seller stock endpoints
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/seller/stocks

# Test admin stock management  
curl -H "Authorization: Bearer $ADMIN_TOKEN" \
  http://localhost:3000/admin/seller-stocks
```

## Performance Considerations

### Query Optimization
- Use populate selectively
- Add pagination for large datasets
- Consider aggregation for complex reports

### Index Usage
```javascript
// Efficient queries use indexes
SellerStock.find({ seller: sellerId }); // Uses seller index
SellerStock.find({ product: productId }); // Uses product index
SellerStock.findOne({ seller: sellerId, product: productId }); // Uses compound index
```

### Memory Usage
- Separate collection reduces Product document size
- Better for frequent stock updates
- Improved cache efficiency

## Future Improvements

1. **Stock History**: Add SellerStockHistory model
2. **Batch Operations**: Optimize bulk transfers
3. **Real-time Updates**: WebSocket stock notifications
4. **Advanced Analytics**: Stock movement patterns
5. **Automated Reordering**: Low stock alerts

## Support

If you encounter issues:

1. Check migration logs in console
2. Run validation script
3. Review error messages carefully
4. Test queries in MongoDB shell
5. Contact development team with logs

Remember: This migration is designed to be safe and reversible, but always backup your data first!
