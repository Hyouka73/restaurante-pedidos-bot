// backend/src/services/discountRuleService.js
const { db } = require('../config/firebase');

class DiscountRuleService {

  _getCollectionRef(restaurantId) {
    return db.collection('restaurants').doc(restaurantId).collection('discount_rules');
  }

  async getDiscountRules(restaurantId) {
    try {
      const snapshot = await this._getCollectionRef(restaurantId).orderBy('createdAt', 'desc').get();
      const rules = [];
      snapshot.forEach(doc => {
        rules.push({ id: doc.id, ...doc.data() });
      });
      return rules;
    } catch (error) {
      console.error('Error al obtener las reglas de descuento:', error);
      throw error;
    }
  }

  async getDiscountRule(restaurantId, ruleId) {
    try {
      const doc = await this._getCollectionRef(restaurantId).doc(ruleId).get();
      if (!doc.exists) {
        throw new Error('Regla de descuento no encontrada');
      }
      return { id: doc.id, ...doc.data() };
    } catch (error) {
      console.error('Error al obtener la regla de descuento:', error);
      throw error;
    }
  }

  async createDiscountRule(restaurantId, ruleData) {
    try {
      const ruleRef = this._getCollectionRef(restaurantId).doc();
      const dataToSave = {
        ...ruleData,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      await ruleRef.set(dataToSave);
      return { success: true, id: ruleRef.id };
    } catch (error) {
      console.error('Error al crear la regla de descuento:', error);
      throw error;
    }
  }

  async updateDiscountRule(restaurantId, ruleId, ruleData) {
    try {
      const ruleRef = this._getCollectionRef(restaurantId).doc(ruleId);
      const doc = await ruleRef.get();
      if (!doc.exists) {
        throw new Error('Regla de descuento no encontrada');
      }
      const dataToUpdate = {
        ...ruleData,
        updatedAt: new Date()
      };
      await ruleRef.update(dataToUpdate);
      return { success: true };
    } catch (error) {
      console.error('Error al actualizar la regla de descuento:', error);
      throw error;
    }
  }

  async deleteDiscountRule(restaurantId, ruleId) {
    try {
      await this._getCollectionRef(restaurantId).doc(ruleId).delete();
      return { success: true };
    } catch (error) {
      console.error('Error al eliminar la regla de descuento:', error);
      throw error;
    }
  }

  async applyDynamicCombos(cart, restaurantId) {
    // 1. Almacenar el descuento antiguo para comparar
    const oldDiscount = cart.discount; // Puede ser undefined o un objeto
    const oldDiscountAmount = oldDiscount?.amount || 0;

    const rules = await this.getDiscountRules(restaurantId);
    const cartItemIds = new Set(cart.items.map(item => item.id));

    let appliedRule = null;
    let bestDiscount = 0;
    for (const rule of rules) {
      const ruleConditions = rule.condiciones || [];
      if (ruleConditions.length === 0) continue;

      const isMatch = ruleConditions.every(requiredItemId => cartItemIds.has(requiredItemId));
      
      if (isMatch) {
        const comboItemsInCart = cart.items.filter(item => ruleConditions.includes(item.id));
        const comboBasePrice = comboItemsInCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        
        let currentDiscount = 0;
        if (rule.accion.tipo === 'descuento_porcentual') {
          currentDiscount = comboBasePrice * (rule.accion.valor / 100);
        } else if (rule.accion.tipo === 'precio_paquete_fijo') {
          // El descuento es la diferencia entre el precio base y el precio fijo
          const fixedPrice = rule.accion.valor;
          currentDiscount = comboBasePrice - fixedPrice;
        }

        if (currentDiscount > bestDiscount) {
          bestDiscount = currentDiscount;
          appliedRule = rule;
        }
      }
    }

    // *** INICIO DE LÓGICA DE NOTIFICACIÓN MEJORADA ***
    let notification = null;
    cart.subtotal = cart.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    if (appliedRule && bestDiscount > 0) {
      // Caso 1: Se aplica un descuento
      
      // Solo notificar si el descuento es NUEVO o DIFERENTE al anterior
      if (appliedRule && bestDiscount.toFixed(2) !== oldDiscountAmount.toFixed(2)) {
          notification = {
            titulo: '¡Combo Detectado!',
            texto: `¡Felicidades! Activaste la promo "${appliedRule.nombre_regla}" y ahorraste $${bestDiscount.toFixed(2)}.`
          };
      }
      
      cart.discount = {
        amount: bestDiscount,
        ruleName: appliedRule.nombre_regla
      };
      cart.total = cart.subtotal - bestDiscount + (cart.delivery?.fee || 0);

    } else if (!appliedRule && oldDiscountAmount > 0) {
      // Caso 2: NO hay regla aplicable, PERO HABÍA un descuento antes
      notification = {
        titulo: 'Promo Desactivada',
        texto: `Al modificar tu carrito, la promo "${oldDiscount.ruleName}" ya no aplica. El descuento de $${oldDiscountAmount.toFixed(2)} ha sido removido.`
      };
      delete cart.discount;
      cart.total = cart.subtotal + (cart.delivery?.fee || 0);
    
    } else {
      // Caso 3: Sin descuento nuevo y sin descuento antiguo
      delete cart.discount;
      cart.total = cart.subtotal + (cart.delivery?.fee || 0);
    }

    return { cart, notification };
    // *** FIN DE LÓGICA DE NOTIFICACIÓN MEJORADA ***
  }
}

module.exports = new DiscountRuleService();