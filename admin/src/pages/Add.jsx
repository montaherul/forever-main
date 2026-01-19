import React, { useEffect, useState, useContext } from "react";
import { assets } from "../assets/assets";
import axios from "axios";
import { backendUrl, AdminContext } from "../App";
import { toast } from "react-toastify";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getSizesByCategory,
  getSizesBySubcategory,
} from "../config/sizeConfig.js";

const Add = () => {
  const { token } = useContext(AdminContext);
  const [image1, setImage1] = useState(false);
  const [image2, setImage2] = useState(false);
  const [image3, setImage3] = useState(false);
  const [image4, setImage4] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("Fresh Vegetables");
  const [subCategory, setSubCategoy] = useState("Organic");
  const [bestseller, setBestseller] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [sizes, setSizes] = useState([]);
  const [sizePricing, setSizePricing] = useState({}); // NEW: Size-specific pricing
  const [sizeStock, setSizeStock] = useState({}); // NEW: Size-specific stock
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [warranty, setWarranty] = useState("");
  const [specsText, setSpecsText] = useState(""); // key:value per line or JSON
  const [sku, setSku] = useState("");
  const [tags, setTags] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [depth, setDepth] = useState("");

  // Edit mode support
  const location = useLocation();
  const navigate = useNavigate();
  const [isEdit, setIsEdit] = useState(false);
  const [productId, setProductId] = useState(null);
  const [existingImages, setExistingImages] = useState([]);

  useEffect(() => {
    const product = location.state?.product;
    if (product) {
      setIsEdit(true);
      setProductId(product._id);
      setName(product.name || "");
      setDescription(product.description || "");
      setPrice(product.price || "");
      setDiscount(product.discount || 0);
      setCategory(product.category || "Men");
      setSubCategoy(product.subCategory || "Topwear");
      setBestseller(!!product.bestseller);
      setSizes(product.sizes || []);
      setSizePricing(product.sizePricing || {});
      setSizeStock(product.sizeStock || {});
      setExistingImages(product.images || []);
      setBrand(product.brand || "");
      setModel(product.model || "");
      setWarranty(product.warranty || "");
      setSku(product.sku || "");
      setTags((product.tags || []).join(", "));
      setWidth(product.dimensions?.width || "");
      setHeight(product.dimensions?.height || "");
      setDepth(product.dimensions?.depth || "");
      if (product.specs) {
        const lines = Object.entries(product.specs || {})
          .map(([k, v]) => `${k}: ${v}`)
          .join("\n");
        setSpecsText(lines);
      }
    }
  }, [location.state]);

  const onSubmitHandler = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();

      formData.append("name", name);
      formData.append("description", description);
      formData.append("price", price);
      formData.append("category", category);
      formData.append("subCategory", subCategory);
      formData.append("bestseller", bestseller);
      formData.append("discount", discount || 0);
      formData.append("sizes", JSON.stringify(sizes));
      formData.append("sizePricing", JSON.stringify(sizePricing)); // NEW
      formData.append("sizeStock", JSON.stringify(sizeStock));
      if (sku) formData.append("sku", sku);
      if (tags) formData.append("tags", tags);
      if (width) formData.append("width", width);
      if (height) formData.append("height", height);
      if (depth) formData.append("depth", depth);
      if (brand) formData.append("brand", brand);
      if (warranty) formData.append("warranty", warranty);
      if (specsText) formData.append("specs", specsText);

      image1 && formData.append("image1", image1);
      image2 && formData.append("image2", image2);
      image3 && formData.append("image3", image3);
      image4 && formData.append("image4", image4);

      let url = backendUrl + "/api/product/add";
      if (isEdit && productId) {
        url = backendUrl + "/api/product/update";
        formData.append("id", productId);
      }

      const response = await axios.post(url, formData, { headers: { token } });
      if (response.data.success) {
        toast.success(response.data.message);
        if (isEdit) {
          navigate("/list");
        } else {
          setName("");
          setDescription("");
          setImage1(false);
          setImage2(false);
          setImage3(false);
          setImage4(false);
          setExistingImages([]);
          setPrice("");
          setDiscount(0);
          setSizes([]);
          setSizePricing({});
          setSizeStock({});
          setBestseller(false);
          setSku("");
          setTags("");
          setWidth("");
          setHeight("");
          setDepth("");
        }
      } else {
        toast.error(response.data.message);
      }
    } catch (error) {
      console.log(error);
      toast.error(error.message);
    }
  };

  const previewSrc = (file, fallback) => {
    if (file) return URL.createObjectURL(file);
    return fallback || assets.upload_area;
  };
  return (
    <form
      onSubmit={onSubmitHandler}
      className="flex flex-col w-full items-start gap-6 bg-white p-8 rounded-2xl shadow-lg border border-gray-100"
    >
      {/* Header */}
      <div className="w-full mb-6 pb-6 border-b-2 border-green-100">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          {isEdit ? "📝 Edit Product" : "➕ Add New Product"}
        </h2>
        <p className="text-gray-600">
          Upload product images and details to the catalog
        </p>
      </div>

      {/* Image Upload Section */}
      <div className="w-full">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-800">
            📸 Product Images
          </h3>
          <span className="text-sm text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full">
            Optional
          </span>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Upload up to 4 product images. You can add or update images later if
          you skip this step.
        </p>
        <div className="grid grid-flow-row-dense grid-cols-2 md:grid-cols-4 gap-4 w-full">
          {[1, 2, 3, 4].map((num) => {
            const imageState = {
              1: [image1, setImage1],
              2: [image2, setImage2],
              3: [image3, setImage3],
              4: [image4, setImage4],
            }[num];
            const existingImage = existingImages[num - 1];
            const imageId = `image${num}`;

            return (
              <label
                key={imageId}
                htmlFor={imageId}
                className="cursor-pointer group relative overflow-hidden rounded-xl border-2 border-dashed border-green-300 hover:border-green-600 transition-all"
              >
                <img
                  className="w-full h-40 object-cover group-hover:opacity-75 transition-opacity"
                  src={previewSrc(imageState[0], existingImage)}
                  alt={`Product Image ${num}`}
                />
                <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                  <span className="text-white font-semibold">Change Image</span>
                </div>
                <input
                  onChange={(e) => imageState[1](e.target.files[0])}
                  type="file"
                  id={imageId}
                  className="hidden"
                />
                <p className="absolute bottom-2 left-2 text-xs font-semibold text-white bg-black/50 px-2 py-1 rounded">
                  Image {num}
                </p>
              </label>
            );
          })}
        </div>
      </div>

      {/* Product Details Section */}
      <div className="w-full space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            🏷️ Product Name
          </label>
          <input
            onChange={(e) => setName(e.target.value)}
            value={name}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-600 focus:ring-2 focus:ring-green-200 focus:outline-none transition-all"
            type="text"
            placeholder="e.g., Wireless ANC Headphones / Linen Shirt / Fresh Organic Tomatoes"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📝 Description
          </label>
          <textarea
            onChange={(e) => setDescription(e.target.value)}
            value={description}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-600 focus:ring-2 focus:ring-green-200 focus:outline-none h-24 resize-none transition-all"
            placeholder="Describe the product features, materials, origin, or benefits..."
            required
          />
        </div>
      </div>

      {/* Category, SubCategory, and Price */}
      <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🏷️ Brand (optional)
            </label>
            <input
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-600 focus:ring-2 focus:ring-green-200 focus:outline-none transition-all"
              type="text"
              placeholder="e.g., Samsung, Apple, TechPro"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🔢 Model (optional)
            </label>
            <input
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-600 focus:ring-2 focus:ring-green-200 focus:outline-none transition-all"
              type="text"
              placeholder="e.g., Galaxy S24 Ultra"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              🛡️ Warranty (optional)
            </label>
            <input
              value={warranty}
              onChange={(e) => setWarranty(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-600 focus:ring-2 focus:ring-green-200 focus:outline-none transition-all"
              type="text"
              placeholder="e.g., 1 Year Official Warranty"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            🥬 Category
          </label>
          <select
            onChange={(e) => {
              setCategory(e.target.value);
              setSizes([]); // Reset sizes when category changes
              setSizePricing({});
              setSizeStock({});
            }}
            value={category}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-600 focus:outline-none transition-all"
          >
            <option value="Fresh Vegetables">🥗 Fresh Vegetables</option>
            <option value="Fresh Fruits">🍎 Fresh Fruits</option>
            <option value="Dairy Products">🥛 Dairy Products</option>
            <option value="Bakery Items">🍞 Bakery Items</option>
            <option value="Snacks">🍿 Snacks</option>
            <option value="Breakfast">🥞 Breakfast</option>
            <option value="Drinks">🥤 Drinks</option>
            <option value="Grains & Cereals">🌾 Grains & Cereals</option>
            <option value="Meat & Seafood">🍖 Meat & Seafood</option>
            <option value="Electronics">💻 Electronics</option>
            <option value="Fashion">👗 Fashion</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Category determines available size options
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            🏷️ Subcategory
          </label>
          <select
            onChange={(e) => {
              setSubCategoy(e.target.value);
              setSizes([]); // Reset sizes when subcategory changes
              setSizePricing({});
              setSizeStock({});
            }}
            value={subCategory}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-600 focus:outline-none transition-all"
          >
            <option value="Organic">🌱 Organic</option>
            <option value="Regular">📦 Regular</option>
            <option value="Premium">⭐ Premium</option>
            <option value="Local">🏡 Local Farm</option>
            <option value="Laptops">💻 Laptops</option>
            <option value="Smartphones">📱 Smartphones</option>
            <option value="Headphones">🎧 Headphones</option>
            <option value="Smart Home">🏠 Smart Home</option>
            <option value="Wearables">⌚ Wearables</option>
            <option value="Televisions">📺 Televisions</option>
            <option value="Men">👔 Men</option>
            <option value="Women">👗 Women</option>
            <option value="Shoes">👟 Shoes</option>
            <option value="Accessories">👜 Accessories</option>
            <option value="Activewear">🏃 Activewear</option>
          </select>
          <p className="text-xs text-gray-500 mt-1">
            Subcategory further refines available sizes
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            💰 Base Price ($)
          </label>
          <input
            onChange={(e) => setPrice(e.target.value)}
            value={price}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-600 focus:outline-none transition-all"
            type="number"
            placeholder="0.00"
            min="0"
            step="0.01"
            required
          />
          <p className="text-xs text-blue-600 mt-1 font-medium">
            💡 Tip: Set this to the lowest size price. It will show "From $
            {price || "0.00"}" in listings.
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            💸 Discount (%)
          </label>
          <input
            onChange={(e) =>
              setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))
            }
            value={discount}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-orange-500 focus:ring-2 focus:ring-orange-200 focus:outline-none transition-all"
            type="number"
            placeholder="0"
            min="0"
            max="100"
          />
          <p className="text-xs text-gray-500 mt-1">
            Optional. Enter percentage off (0-100). Final price is shown to
            customers.
          </p>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            🆔 SKU (optional)
          </label>
          <input
            value={sku}
            onChange={(e) => setSku(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-600 focus:ring-2 focus:ring-green-200 focus:outline-none transition-all"
            type="text"
            placeholder="e.g., ELEC-00123"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            🏷️ Tags (comma separated)
          </label>
          <input
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-600 focus:ring-2 focus:ring-green-200 focus:outline-none transition-all"
            type="text"
            placeholder="e.g., gaming, 4K, OLED"
          />
        </div>
      </div>

      {/* Physical Details */}
      <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            📐 Dimensions (optional)
          </label>
          <div className="grid grid-cols-3 gap-2">
            <input
              value={width}
              onChange={(e) => setWidth(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-green-600 focus:outline-none"
              type="text"
              placeholder="W"
            />
            <input
              value={height}
              onChange={(e) => setHeight(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-green-600 focus:outline-none"
              type="text"
              placeholder="H"
            />
            <input
              value={depth}
              onChange={(e) => setDepth(e.target.value)}
              className="w-full px-3 py-2 border-2 border-gray-200 rounded-lg focus:border-green-600 focus:outline-none"
              type="text"
              placeholder="D"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">Example: 14" x 9" x 0.6"</p>
        </div>
      </div>

      {/* Sizes Section - Dynamic based on Category/Subcategory */}
      <div className="w-full">
        <label className="block text-sm font-semibold text-gray-700 mb-3">
          📦 Product Sizes / Options / Variants
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Sizes are automatically filtered based on your selected category and
          subcategory.
        </p>

        {/* Show available sizes for selected category */}
        <div className="mb-4 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
          <p className="text-xs text-blue-700 font-semibold mb-3">
            📋 Available sizes for <strong>{category}</strong>
            {subCategory && ` / ${subCategory}`}:
          </p>
          <div className="flex gap-3 flex-wrap">
            {(() => {
              // Prefer subcategory sizes, fall back to category sizes
              const sizesToShow = getSizesBySubcategory(subCategory, category);
              return sizesToShow.length > 0 ? (
                sizesToShow.map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      const newSizes = sizes.includes(size)
                        ? sizes.filter((item) => item !== size)
                        : [...sizes, size];
                      setSizes(newSizes);

                      // Remove pricing/stock if size is deselected
                      if (!newSizes.includes(size)) {
                        const newPricing = { ...sizePricing };
                        delete newPricing[size];
                        setSizePricing(newPricing);
                        const newStock = { ...sizeStock };
                        delete newStock[size];
                        setSizeStock(newStock);
                      }
                    }}
                    className={`px-4 py-2 rounded-lg font-medium transition-all border-2 ${
                      sizes.includes(size)
                        ? "bg-green-600 text-white border-green-600 shadow-md"
                        : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                    }`}
                  >
                    {size}
                  </button>
                ))
              ) : (
                <p className="text-sm text-gray-600">
                  No specific sizes configured for this category. You can add
                  custom sizes below.
                </p>
              );
            })()}
          </div>
        </div>

        {/* Custom size input */}
        <div className="p-4 bg-gray-50 rounded-lg border-2 border-gray-200">
          <p className="text-xs text-gray-700 font-semibold mb-3">
            ➕ Add Custom Size (if not in the list):
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              id="customSize"
              placeholder="e.g., 65-inch, 32GB, S/M/L combo"
              className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-green-600 focus:outline-none text-sm"
            />
            <button
              type="button"
              onClick={() => {
                const customSizeInput = document.getElementById("customSize");
                const customSize = customSizeInput.value.trim();
                if (customSize && !sizes.includes(customSize)) {
                  setSizes([...sizes, customSize]);
                  customSizeInput.value = "";
                } else if (sizes.includes(customSize)) {
                  toast.warning("Size already added!");
                }
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-all"
            >
              Add Size
            </button>
          </div>
        </div>
      </div>

      {/* Specs Section */}
      <div className="w-full">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          📑 Specs (optional)
        </label>
        <p className="text-xs text-gray-500 mb-2">
          Add one spec per line using "Label: Value" (e.g., Processor:
          Snapdragon 8 Gen 3). JSON is also accepted.
        </p>
        <textarea
          value={specsText}
          onChange={(e) => setSpecsText(e.target.value)}
          className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-green-600 focus:ring-2 focus:ring-green-200 focus:outline-none transition-all h-28"
          placeholder={`Processor: Intel i7\nRAM: 16GB\nStorage: 512GB SSD\nDisplay: 14" 2.8K`}
        />
      </div>

      {/* Size Pricing Section - NEW */}
      {sizes.length > 0 && (
        <div className="w-full bg-blue-50 p-6 rounded-xl border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
              <span>💰</span> Set Price for Each Size/Unit
            </h3>
            <button
              type="button"
              onClick={() => {
                const prices = Object.values(sizePricing).filter((p) => p > 0);
                if (prices.length > 0) {
                  const lowestPrice = Math.min(...prices);
                  setPrice(lowestPrice.toString());
                }
              }}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-lg transition-all"
            >
              🔄 Auto-Set Base Price (Lowest)
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            💡 <strong>Important:</strong> Enter individual prices for each
            size. The <strong>Base Price</strong> above should be set to the{" "}
            <strong>lowest</strong> size price to show "From $X.XX" in product
            listings.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sizes.map((size) => (
              <div
                key={size}
                className="bg-white p-4 rounded-lg border-2 border-gray-200"
              >
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  {size} - Price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g., 9.99"
                  value={sizePricing[size] || ""}
                  onChange={(e) => {
                    const newPricing = { ...sizePricing };
                    if (e.target.value) {
                      newPricing[size] = parseFloat(e.target.value);
                    } else {
                      delete newPricing[size];
                    }
                    setSizePricing(newPricing);
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                />
                <label className="block text-sm font-semibold text-gray-700 mt-3 mb-2">
                  {size} - Stock (qty)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  placeholder="e.g., 25"
                  value={sizeStock[size] ?? ""}
                  onChange={(e) => {
                    const newStock = { ...sizeStock };
                    if (e.target.value === "") {
                      delete newStock[size];
                    } else {
                      newStock[size] = Math.max(0, Number(e.target.value) || 0);
                    }
                    setSizeStock(newStock);
                  }}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:ring-2 focus:ring-blue-200 focus:outline-none transition-all"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Bestseller Checkbox */}
      <div className="flex items-center gap-3 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200 w-full">
        <input
          onChange={() => setBestseller((prev) => !prev)}
          checked={bestseller}
          type="checkbox"
          id="bestseller"
          className="w-5 h-5 rounded cursor-pointer"
        />
        <label
          className="cursor-pointer font-semibold text-gray-700 flex items-center gap-2"
          htmlFor="bestseller"
        >
          ⭐ Mark as Bestseller Product
        </label>
      </div>

      {/* Submit Button */}
      <button
        type="submit"
        className="mt-6 px-8 py-3 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white font-bold rounded-lg shadow-lg hover:shadow-xl transition-all min-w-[200px]"
      >
        {isEdit ? "✅ UPDATE PRODUCT" : "➕ ADD PRODUCT"}
      </button>
    </form>
  );
};

export default Add;
