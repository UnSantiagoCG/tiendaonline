import { useState } from 'react'
import { ShoppingBag, X, Minus, Plus, ShoppingCart } from 'lucide-react'
import { products } from './data/mockData'

function App() {
  const [cart, setCart] = useState([])
  const [isCartOpen, setIsCartOpen] = useState(false)
  const [currentPage, setCurrentPage] = useState(1)

  const itemsPerPage = 30;
  const totalPages = Math.ceil(products.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProducts = products.slice(startIndex, startIndex + itemsPerPage);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id)
      if (existing) {
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      }
      return [...prev, { ...product, quantity: 1 }]
    })
  }

  const updateQuantity = (id, delta) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQuantity = item.quantity + delta
        return newQuantity > 0 ? { ...item, quantity: newQuantity } : item
      }
      return item
    }).filter(item => item.quantity > 0))
  }

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id))
  }

  const cartTotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0)

  return (
    <>
      <header className="header">
        <div className="container header-content">
          <div className="logo">
            <ShoppingBag className="text-gradient" size={28} />
            <span className="text-gradient">Tienda<span style={{color: 'var(--text-main)'}}>Virtual</span></span>
          </div>
          <button className="btn-icon cart-button" onClick={() => setIsCartOpen(true)}>
            <ShoppingCart size={24} />
            {cartItemCount > 0 && <span className="badge">{cartItemCount}</span>}
          </button>
        </div>
      </header>

      <main className="container">
        <section className="hero" style={{padding: '4rem 0 2rem', textAlign: 'center'}}>
          <h1 style={{fontSize: '3rem', fontWeight: '800', marginBottom: '1rem', letterSpacing: '-0.02em'}}>
            Descubre nuestra <span className="text-gradient">Colección Especial</span>
          </h1>
          <p style={{color: 'var(--text-muted)', fontSize: '1.125rem', maxWidth: '600px', margin: '0 auto'}}>
            Productos increíbles con diseños modernos. Añade al carrito y experimenta una interfaz rápida y atractiva.
          </p>
        </section>

        <div className="product-grid">
          {currentProducts.map(product => (
            <div key={product.id} className="product-card">
              <div className="product-image-container" style={{ overflow: 'hidden', height: '280px', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fdfdfd' }}>
                {product.page ? (
                  <img src={`./images/${product.page}.jpg`} alt={product.name} className="product-image" loading="lazy" onError={(e) => { e.target.onerror = null; e.target.src = './placeholder.jpg'; }} />
                ) : (
                  <img src={product.image} alt={product.name} className="product-image" loading="lazy" />
                )}
              </div>
              <div className="product-info">
                <h3 className="product-title">{product.name}</h3>
                <div className="product-footer">
                  <span className="product-price">${product.price.toLocaleString('es-CO')}</span>
                  <button className="btn btn-primary" onClick={() => addToCart(product)}>
                    Añadir al carrito
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {totalPages > 1 && (
          <div className="pagination" style={{ display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '3rem', paddingBottom: '2rem' }}>
            <button className="btn" disabled={currentPage === 1} onClick={() => { setCurrentPage(prev => prev - 1); window.scrollTo({top: 0, behavior: 'smooth'}); }}>Comprar Anteriores</button>
            <span style={{ alignSelf: 'center', fontWeight: 'bold' }}>Página {currentPage} de {totalPages} ({products.length} productos)</span>
            <button className="btn" disabled={currentPage === totalPages} onClick={() => { setCurrentPage(prev => prev + 1); window.scrollTo({top: 0, behavior: 'smooth'}); }}>Ver Más Productos</button>
          </div>
        )}
      </main>

      {/* Cart Drawer */}
      <div className={`cart-overlay ${isCartOpen ? 'open' : ''}`} onClick={() => setIsCartOpen(false)}></div>
      <div className={`cart-drawer ${isCartOpen ? 'open' : ''}`}>
        <div className="cart-header">
          <h2>Tu Carrito ({cartItemCount})</h2>
          <button className="btn-icon" onClick={() => setIsCartOpen(false)}>
            <X size={24} />
          </button>
        </div>
        
        <div className="cart-items">
          {cart.length === 0 ? (
            <div className="cart-empty">
              <ShoppingBag size={48} opacity={0.2} />
              <p>Tu carrito está vacío.</p>
              <button className="btn btn-primary" onClick={() => setIsCartOpen(false)}>
                Continuar Comprando
              </button>
            </div>
          ) : (
            cart.map(item => (
              <div key={item.id} className="cart-item">
                <div style={{width: '60px', height: '60px', overflow: 'hidden', borderRadius: '8px', flexShrink: 0}}>
                  {item.page ? (
                     <img src={`./images/${item.page}.jpg`} alt={item.name} className="cart-item-img" style={{width: '100%', height: '100%', objectFit: 'cover'}} onError={(e) => { e.target.onerror = null; e.target.src = './placeholder.jpg'; }} />
                  ) : (
                     <img src={item.image} alt={item.name} className="cart-item-img" style={{width: '100%', height: '100%', objectFit: 'cover'}} />
                  )}
                </div>
                <div className="cart-item-details">
                  <h4 className="cart-item-title">{item.name}</h4>
                  <div className="cart-item-price">${item.price.toLocaleString('es-CO')}</div>
                  <div className="cart-item-actions">
                    <button className="qty-btn" onClick={() => updateQuantity(item.id, -1)}><Minus size={14}/></button>
                    <span style={{fontSize: '0.875rem', fontWeight: '500'}}>{item.quantity}</span>
                    <button className="qty-btn" onClick={() => updateQuantity(item.id, 1)}><Plus size={14}/></button>
                    <button 
                      className="btn-icon" 
                      style={{marginLeft: 'auto', color: '#ef4444', padding: '0.25rem'}}
                      onClick={() => removeFromCart(item.id)}
                    >
                      <X size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {cart.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>Total</span>
              <span>${cartTotal.toLocaleString('es-CO')}</span>
            </div>
            <button className="btn btn-primary" style={{width: '100%'}}>
              Proceder al Pago
            </button>
          </div>
        )}
      </div>
    </>
  )
}

export default App
