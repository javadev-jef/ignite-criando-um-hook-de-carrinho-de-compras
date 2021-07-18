import { useEffect } from 'react';
import { useRef } from 'react';
import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

type ProductInfo = Omit<Product, 'amount'>;

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const prevCartRef = useRef<Product[]>();

  useEffect(() => {
    prevCartRef.current = cart;
  });

  const cartPreviousValue = prevCartRef.current ?? cart;

  useEffect(() => {
    if(cartPreviousValue !== cart) {
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cart));
    }
  }, [cart, cartPreviousValue]);

  const addProduct = async (productId: number) => {
    try {
      const response = await api.get(`/stock/${productId}`);
      const productStotck: Stock = response.data;

      if(productStotck.amount > 0) {
        const updatedCart = [...cart];
        const cartItem = updatedCart.find(item => item.id === productId);
        const currentAmount = cartItem ? cartItem.amount : 0;
        const amount = currentAmount + 1;

        if(amount > productStotck.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        if(cartItem) {
          cartItem.amount = amount;
        } else {
          const productInfo = await getProduct(productId);
          updatedCart.push({...productInfo, amount: 1});
        }

        setCart(updatedCart);
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const getProduct = async (id: number): Promise<ProductInfo> => {
    const response = await api.get(`/products/${id}`);
    return response.data;
  }

  const removeProduct = (productId: number) => {
    try {
      const currentCart = [...cart];
      const updatedCart = currentCart.filter(item => item.id !== productId);

      if(updatedCart.length !== currentCart.length) {
        setCart(updatedCart);
      } else {
        throw Error();
      }
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      if(amount <= 0) {
        return;
      }

      const response = await api.get(`/stock/${productId}`);
      const productStotck: Stock = response.data;

      if(amount <= productStotck.amount) {
        const updatedCart = [...cart];
        const cartItem = updatedCart.find(item => item.id === productId);
        if(cartItem) {
          cartItem.amount = amount;
          setCart(updatedCart);
        } else {
          throw Error();
        }
      } else {
        toast.error('Quantidade solicitada fora de estoque');
      }
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
