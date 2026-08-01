import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, TouchableOpacity, Alert, SafeAreaView, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { ArrowLeft, MapPin, CreditCard, ChevronRight, Check } from "lucide-react-native";
import { supabase } from "../../config/supabaseClient";
import { useAuthStore } from "../../shared/stores/useAuthStore";
import { useCartStore } from "../../shared/stores/useCartStore";
import { Input } from "../../shared/components/Input";
import { Button } from "../../shared/components/Button";

interface Address {
  id: string;
  name: string;
  phone: string;
  address_line?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  state: string;
  pincode: string;
  landmark?: string;
  is_default: boolean;
}

export default function CheckoutPage() {
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const { items, clearCart } = useCartStore();

  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  
  // Payment States
  const [paymentMethod, setPaymentMethod] = useState<"COD" | "Razorpay">("COD");
  const [loading, setLoading] = useState(false);
  const [addingAddress, setAddingAddress] = useState(false);

  // New Address Form States
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAddressLine1, setNewAddressLine1] = useState("");
  const [newAddressLine2, setNewAddressLine2] = useState("");
  const [newCity, setNewCity] = useState("");
  const [newState, setNewState] = useState("");
  const [newPincode, setNewPincode] = useState("");

  const loadAddresses = async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from("user_addresses")
        .select("*")
        .eq("user_id", user.id);

      if (data) {
        setAddresses(data as Address[]);
        const defaultAddr = data.find((a) => a.is_default);
        if (defaultAddr) {
          setSelectedAddressId(defaultAddr.id);
        } else if (data.length > 0) {
          setSelectedAddressId(data[0].id);
        }
      }
    } catch (e) {
      console.warn("Addresses load error:", e);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, [user]);

  const handleAddAddress = async () => {
    if (!newName.trim() || !newPhone.trim() || !newAddressLine1.trim() || !newCity.trim() || !newState.trim() || !newPincode.trim()) {
      Alert.alert("Error", "Please fill in all required address fields.");
      return;
    }

    setLoading(true);
    try {
      const newAddr = {
        user_id: user.id,
        user_email: user.email,
        name: newName,
        phone: newPhone,
        address_line: `${newAddressLine1}, ${newAddressLine2 || ""}, ${newCity}, ${newState} - ${newPincode}`,
        address_line1: newAddressLine1,
        address_line2: newAddressLine2,
        city: newCity,
        state: newState,
        pincode: newPincode,
        is_default: addresses.length === 0,
      };

      const { data, error } = await supabase
        .from("user_addresses")
        .insert(newAddr)
        .select();

      if (error) throw error;

      Alert.alert("Success", "Delivery address added.");
      setAddingAddress(false);
      await loadAddresses();
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to save address.");
    } finally {
      setLoading(false);
    }
  };

  const handlePlaceOrder = async () => {
    if (!selectedAddressId) {
      Alert.alert("Error", "Please select a delivery address.");
      return;
    }

    const address = addresses.find((a) => a.id === selectedAddressId);
    if (!address) return;

    setLoading(true);

    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const platformFee = 5;
    const deliveryCharge = subtotal > 500 ? 0 : 40;
    const tax = Math.round(subtotal * 0.05);
    const totalAmount = subtotal + platformFee + deliveryCharge + tax;

    // Compile items list
    const orderItems = items.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity,
      image_url: item.image_url,
    }));

    const orderNumber = `AS-${Date.now().toString().slice(-8)}`;

    try {
      // Replicate checkout table mappings: customer_name, address, product_details
      const orderPayload = {
        order_number: orderNumber,
        user_id: user.id,
        seller_id: items[0].seller_id || null, // Associates first item's seller
        customer_name: address.name,
        phone: address.phone,
        address: address.address_line || `${address.address_line1}, ${address.address_line2 || ""}, ${address.city}, ${address.state} - ${address.pincode}`,
        shipping_address: {
          name: address.name,
          phone: address.phone,
          line1: address.address_line1,
          line2: address.address_line2,
          city: address.city,
          state: address.state,
          pincode: address.pincode,
        },
        product_details: JSON.stringify(orderItems), // Sync with web JSON string format
        items: orderItems,
        total_amount: totalAmount,
        shipping_charge: deliveryCharge,
        payment_method: paymentMethod,
        payment_status: paymentMethod === "Razorpay" ? "PAID" : "PENDING",
        order_status: "placed",
      };

      const { error } = await supabase.from("orders").insert(orderPayload);
      if (error) throw error;

      await clearCart(user.id);
      Alert.alert("Order Placed!", `Your order ${orderNumber} has been successfully placed.`, [
        {
          text: "View Orders",
          onPress: () => router.replace("/orders/history"),
        },
      ]);
    } catch (err: any) {
      Alert.alert("Checkout Failed", err.message || "Could not process order.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        className="flex-1"
      >
        {/* Navigation Header */}
        <View className="px-4 py-3 bg-slate-950 border-b border-slate-900 flex-row items-center gap-3">
          <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-slate-900">
            <ArrowLeft size={20} color="#ffffff" />
          </TouchableOpacity>
          <Text className="text-sm font-black text-white">Checkout Details</Text>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} className="px-4 pt-4 flex-grow">
          {/* Deliver Address Section */}
          <View className="mb-6">
            <View className="flex-row items-center justify-between mb-3">
              <Text className="text-xs font-black text-slate-400 uppercase tracking-widest">
                Delivery Address
              </Text>
              {!addingAddress && (
                <TouchableOpacity onPress={() => setAddingAddress(true)}>
                  <Text className="text-xs font-black text-primary">+ Add New</Text>
                </TouchableOpacity>
              )}
            </View>

            {addingAddress ? (
              <View className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
                <Input label="Receiver's Name *" value={newName} onChangeText={setNewName} />
                <Input label="Phone Number *" keyboardType="phone-pad" value={newPhone} onChangeText={setNewPhone} />
                <Input label="Address Line 1 *" value={newAddressLine1} onChangeText={setNewAddressLine1} />
                <Input label="Address Line 2 (Optional)" value={newAddressLine2} onChangeText={setNewAddressLine2} />
                <View className="flex-row justify-between gap-2">
                  <Input label="City *" className="flex-1" value={newCity} onChangeText={setNewCity} />
                  <Input label="State *" className="flex-1" value={newState} onChangeText={setNewState} />
                </View>
                <Input label="Pincode *" keyboardType="number-pad" value={newPincode} onChangeText={setNewPincode} />

                <View className="flex-row gap-3 mt-4">
                  <Button
                    title="Cancel"
                    variant="outline"
                    onPress={() => setAddingAddress(false)}
                    className="flex-1"
                  />
                  <Button
                    title="Save Address"
                    onPress={handleAddAddress}
                    loading={loading}
                    className="flex-1"
                  />
                </View>
              </View>
            ) : addresses.length === 0 ? (
              <View className="border border-dashed border-slate-800 rounded-2xl p-6 items-center">
                <MapPin size={24} color="#64748b" />
                <Text className="text-xs font-bold text-slate-500 mt-2">No saved address found.</Text>
                <Button
                  title="Add Address"
                  onPress={() => setAddingAddress(true)}
                  className="mt-4 w-full"
                />
              </View>
            ) : (
              <View className="space-y-3">
                {addresses.map((addr) => {
                  const isSelected = selectedAddressId === addr.id;
                  return (
                    <TouchableOpacity
                      key={addr.id}
                      onPress={() => setSelectedAddressId(addr.id)}
                      activeOpacity={0.8}
                      className={`flex-row p-4 rounded-2xl border items-center justify-between ${
                        isSelected 
                          ? "border-primary bg-slate-900/60" 
                          : "border-slate-800 bg-slate-900"
                      }`}
                    >
                      <View className="flex-1 mr-3">
                        <Text className="text-slate-100 font-extrabold text-xs">
                          {addr.name} ({addr.phone})
                        </Text>
                        <Text className="text-[10px] font-semibold text-slate-400 mt-1 leading-normal">
                          {addr.address_line1}, {addr.address_line2 ? `${addr.address_line2}, ` : ""}{addr.city}, {addr.state} - {addr.pincode}
                        </Text>
                      </View>
                      {isSelected ? (
                        <View className="h-5 w-5 rounded-full bg-primary items-center justify-center">
                          <Check size={12} color="#ffffff" strokeWidth={3} />
                        </View>
                      ) : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Payment Method Section */}
          <View className="mb-12">
            <Text className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3">
              Payment Option
            </Text>

            <View className="space-y-3">
              <TouchableOpacity
                onPress={() => setPaymentMethod("COD")}
                activeOpacity={0.8}
                className={`flex-row p-4 rounded-2xl border items-center justify-between ${
                  paymentMethod === "COD" 
                    ? "border-primary bg-slate-900/60" 
                    : "border-slate-800 bg-slate-900"
                }`}
              >
                <View className="flex-row items-center gap-3">
                  <CreditCard size={18} color="#cbd5e1" />
                  <Text className="text-xs font-extrabold text-slate-200">Cash on Delivery (COD)</Text>
                </View>
                {paymentMethod === "COD" ? (
                  <View className="h-5 w-5 rounded-full bg-primary items-center justify-center">
                    <Check size={12} color="#ffffff" strokeWidth={3} />
                  </View>
                ) : null}
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setPaymentMethod("Razorpay")}
                activeOpacity={0.8}
                className={`flex-row p-4 rounded-2xl border items-center justify-between ${
                  paymentMethod === "Razorpay" 
                    ? "border-primary bg-slate-900/60" 
                    : "border-slate-800 bg-slate-900"
                }`}
              >
                <View className="flex-row items-center gap-3">
                  <CreditCard size={18} color="#cbd5e1" />
                  <Text className="text-xs font-extrabold text-slate-200">Pay Online (UPI / Card / NetBanking)</Text>
                </View>
                {paymentMethod === "Razorpay" ? (
                  <View className="h-5 w-5 rounded-full bg-primary items-center justify-center">
                    <Check size={12} color="#ffffff" strokeWidth={3} />
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>

        {/* Sticky Order Action Button */}
        <View className="bg-slate-950 border-t border-slate-900 px-4 py-3">
          <Button
            title={paymentMethod === "Razorpay" ? "Pay & Place Order" : "Confirm COD & Place Order"}
            onPress={handlePlaceOrder}
            loading={loading}
          />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
