import productModel from "../models/productModel.js";
import pricingModel from "../models/pricingModel.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const productsJsonPath = path.join(__dirname, "../data/products.json");

const parseSpecs = (input) => {
  if (!input) return undefined;
  try {
    if (typeof input === "string") {
      const trimmed = input.trim();
      if (!trimmed) return undefined;
      // Try JSON first
      if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object") return parsed;
      }
      // Fallback: key:value per line
      const lines = trimmed.split(/\r?\n/);
      const obj = {};
      lines.forEach((line) => {
        const [k, ...rest] = line.split(":");
        if (!k || rest.length === 0) return;
        obj[k.trim()] = rest.join(":").trim();
      });
      return Object.keys(obj).length ? obj : undefined;
    }
    if (typeof input === "object") return input;
  } catch (err) {
    console.warn("parseSpecs error", err);
  }
  return undefined;
};

// ✅ Helper function to sync products to JSON file
const syncProductsToJSON = async () => {
  try {
    const products = await productModel.find({}).populate("pricingId");
    fs.writeFileSync(productsJsonPath, JSON.stringify(products, null, 2));
  } catch (error) {
    console.error("Error syncing to JSON:", error);
  }
};

// function for add product
const addProduct = async (req, res) => {
  try {
    const {
      name,
      description,
      price,
      category,
      subCategory,
      sizes,
      bestseller,
      discount,
      sizePricing, // NEW: Size-specific pricing
      brand,
      model,
      warranty,
      specs,
      sku,
      tags,
      weight,
      width,
      height,
      depth,
      stockQuantity,
      sizeStock,
    } = req.body;

    // ✅ Images are now OPTIONAL - products can be added without images
    let imagesUrl = [];

    if (req.files && Object.keys(req.files).length > 0) {
      // ✅ Extract images safely (optional)
      const image1 = req.files.image1?.[0];
      const image2 = req.files.image2?.[0];
      const image3 = req.files.image3?.[0];
      const image4 = req.files.image4?.[0];

      const images = [image1, image2, image3, image4].filter(
        (item) => item !== undefined,
      );

      // ✅ Convert images to base64 if any were uploaded
      if (images.length > 0) {
        imagesUrl = images.map((item) => {
          try {
            const imageBuffer = fs.readFileSync(item.path);
            const base64Image = `data:${
              item.mimetype
            };base64,${imageBuffer.toString("base64")}`;
            // Delete the temporary file after conversion
            if (fs.existsSync(item.path)) {
              fs.unlinkSync(item.path);
            }
            return base64Image;
          } catch (error) {
            console.error(`Error processing image ${item.filename}:`, error);
            throw new Error(`Failed to process image: ${item.filename}`);
          }
        });
      }
    }

    // ✅ Create product data object
    const parsedDiscount = Math.max(
      0,
      Math.min(100, Number.isNaN(Number(discount)) ? 0 : Number(discount)),
    );

    let parsedSizes = [];
    try {
      parsedSizes = JSON.parse(sizes);
    } catch (err) {
      console.warn("sizes parse error", err);
      parsedSizes = [];
    }

    const productData = {
      name,
      description,
      price: Number(price),
      category,
      subCategory,
      sizes: parsedSizes,
      bestseller: bestseller === "true" ? true : false,
      discount: parsedDiscount,
      images: imagesUrl,
      date: Date.now(),
    };

    const parsedSpecs = parseSpecs(specs);
    if (brand) productData.brand = brand;
    if (model) productData.model = model;
    if (warranty) productData.warranty = warranty;
    if (parsedSpecs) productData.specs = parsedSpecs;
    if (sku) productData.sku = sku;
    if (tags) {
      const arr = Array.isArray(tags)
        ? tags
        : tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
      if (arr.length) productData.tags = arr;
    }
    if (weight) productData.weight = weight;
    if (width || height || depth) {
      productData.dimensions = {
        width,
        height,
        depth,
      };
    }
    if (stockQuantity !== undefined) {
      const qty = Number(stockQuantity);
      productData.stockQuantity = Number.isNaN(qty) ? 0 : Math.max(0, qty);
      productData.inStock = productData.stockQuantity > 0;
    }

    if (sizeStock) {
      try {
        const parsed =
          typeof sizeStock === "string" ? JSON.parse(sizeStock) : sizeStock;
        if (parsed && typeof parsed === "object") {
          productData.sizeStock = parsed;
          // derive stockQuantity if not provided
          const total = Object.values(parsed).reduce(
            (acc, val) => acc + (Number(val) || 0),
            0,
          );
          if (productData.stockQuantity === undefined) {
            productData.stockQuantity = total;
            productData.inStock = total > 0;
          }
        }
      } catch (err) {
        console.warn("sizeStock parse error", err);
      }
    }

    // ✅ Save product in DB FIRST
    const product = new productModel(productData);
    await product.save();

    // Validate product was saved with valid _id
    if (!product._id) {
      throw new Error("Product save failed - no _id generated");
    }

    // NEW: Create separate pricing record if sizePricing provided
    let pricingId = null;
    if (sizePricing && sizePricing !== "{}") {
      try {
        const parsed = JSON.parse(sizePricing);
        if (
          parsed &&
          typeof parsed === "object" &&
          Object.keys(parsed).length > 0
        ) {
          // Build sizes array from sizePricing
          const sizesArray = parsedSizes.map((size) => ({
            size,
            price: parsed[size] ? Number(parsed[size]) : Number(price),
          }));

          // Find base price (lowest)
          const basePrice = Math.min(...sizesArray.map((s) => s.price));

          // CRITICAL: Verify product._id exists
          if (!product || !product._id) {
            throw new Error(
              `Cannot create pricing: product._id is ${product?._id}. Product save may have failed.`,
            );
          }

          // Create pricing record WITH productId
          const pricingData = {
            productId: product._id,
            basePrice,
            sizes: sizesArray,
            updatedBy: req.headers.admin || "system",
          };

          const pricingRecord = new pricingModel(pricingData);
          const savedPricing = await pricingRecord.save();
          pricingId = savedPricing._id;

          // Update product with pricingId
          const updatedProduct = await productModel.findByIdAndUpdate(
            product._id,
            { pricingId: pricingId },
            { new: true },
          );
        }
      } catch (error) {
        console.error("❌ Size pricing creation error:", error.message);
        console.error("Error details:", {
          productId: product?._id,
          hasProduct: !!product,
          errorType: error.name,
        });
      }
    }

    // NEW: Auto-create pricing record for products with multiple sizes (no custom pricing)
    if (!pricingId && parsedSizes.length > 1) {
      try {
        // CRITICAL: Verify product._id exists
        if (!product || !product._id) {
          throw new Error(
            `Cannot create auto-pricing: product._id is ${product?._id}. Product save may have failed.`,
          );
        }

        // Create equal pricing for all sizes using base price
        const sizesArray = parsedSizes.map((size) => ({
          size,
          price: Number(price),
        }));

        const basePrice = Number(price);

        const pricingData = {
          productId: product._id,
          basePrice,
          sizes: sizesArray,
          updatedBy: req.headers.admin || "system",
        };

        const pricingRecord = new pricingModel(pricingData);
        const savedPricing = await pricingRecord.save();
        pricingId = savedPricing._id;

        // Update product with pricingId
        await productModel.findByIdAndUpdate(product._id, {
          pricingId: pricingId,
        });
      } catch (error) {
        console.error("❌ Auto-pricing creation error:", error.message);
        console.error("Error details:", {
          productId: product?._id,
          hasProduct: !!product,
          errorType: error.name,
        });
      }
    }

    // ✅ Sync to JSON file
    await syncProductsToJSON();

    const imageMessage =
      imagesUrl.length > 0
        ? `Product Added with ${imagesUrl.length} image(s)`
        : "Product Added (no images yet - you can add later)";

    res.json({
      success: true,
      message: imageMessage,
      productId: product._id,
    });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// function for list product
const listProducts = async (req, res) => {
  try {
    const products = await productModel.find({}).populate("pricingId");
    res.json({ success: true, products });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// function for remove product
const removeProduct = async (req, res) => {
  try {
    await productModel.findByIdAndDelete(req.body.id);

    // ✅ Sync to JSON file
    await syncProductsToJSON();

    res.json({ success: true, message: "Product removed" });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};

// ✅ NEW: function for update product
const updateProduct = async (req, res) => {
  try {
    const {
      id,
      name,
      description,
      price,
      category,
      subCategory,
      sizes,
      bestseller,
      discount,
      sizePricing, // NEW: Size-specific pricing
      brand,
      model,
      warranty,
      specs,
      sku,
      tags,
      weight,
      width,
      height,
      depth,
      stockQuantity,
      sizeStock,
    } = req.body;

    // Find existing product
    const existingProduct = await productModel.findById(id);
    if (!existingProduct) {
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });
    }

    // Create update data object
    const parsedDiscount = Math.max(
      0,
      Math.min(100, Number.isNaN(Number(discount)) ? 0 : Number(discount)),
    );

    const parsedSizes = JSON.parse(sizes);

    const updateData = {
      name,
      description,
      price: Number(price),
      category,
      subCategory,
      sizes: parsedSizes,
      bestseller: bestseller === "true" || bestseller === true,
      discount: parsedDiscount,
      date: Date.now(),
    };

    const parsedSpecsUpdate = parseSpecs(specs);
    if (brand !== undefined) updateData.brand = brand;
    if (model !== undefined) updateData.model = model;
    if (warranty !== undefined) updateData.warranty = warranty;
    if (parsedSpecsUpdate) updateData.specs = parsedSpecsUpdate;
    if (sku !== undefined) updateData.sku = sku;
    if (tags !== undefined) {
      const arr = Array.isArray(tags)
        ? tags
        : String(tags)
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean);
      updateData.tags = arr;
    }
    if (weight !== undefined) updateData.weight = weight;
    if (width !== undefined || height !== undefined || depth !== undefined) {
      updateData.dimensions = {
        width: width !== undefined ? width : existingProduct.dimensions?.width,
        height:
          height !== undefined ? height : existingProduct.dimensions?.height,
        depth: depth !== undefined ? depth : existingProduct.dimensions?.depth,
      };
    }
    if (stockQuantity !== undefined) {
      const qty = Number(stockQuantity);
      updateData.stockQuantity = Number.isNaN(qty) ? 0 : Math.max(0, qty);
      updateData.inStock = updateData.stockQuantity > 0;
    }

    if (sizeStock !== undefined) {
      try {
        const parsed =
          typeof sizeStock === "string" ? JSON.parse(sizeStock) : sizeStock;
        if (parsed && typeof parsed === "object") {
          updateData.sizeStock = parsed;
          const total = Object.values(parsed).reduce(
            (acc, val) => acc + (Number(val) || 0),
            0,
          );
          updateData.stockQuantity =
            updateData.stockQuantity !== undefined
              ? updateData.stockQuantity
              : total;
          updateData.inStock = (updateData.stockQuantity || total) > 0;
        }
      } catch (err) {
        console.warn("sizeStock parse error", err);
      }
    }

    // NEW: Handle size-specific pricing in separate table
    if (sizePricing) {
      try {
        const parsed = JSON.parse(sizePricing);
        if (parsed && typeof parsed === "object") {
          const parsedSizes = JSON.parse(sizes);
          const sizesArray = parsedSizes.map((size) => ({
            size,
            price: parsed[size] || Number(price),
          }));

          const basePrice = Math.min(...sizesArray.map((s) => s.price));

          if (existingProduct.pricingId) {
            // Update existing pricing record
            await pricingModel.findByIdAndUpdate(existingProduct.pricingId, {
              basePrice,
              sizes: sizesArray,
              updatedBy: req.headers.admin || "system",
            });
          } else {
            // Create new pricing record
            const pricingData = {
              productId: id,
              basePrice,
              sizes: sizesArray,
              updatedBy: req.headers.admin || "system",
            };
            const pricingRecord = new pricingModel(pricingData);
            const savedPricing = await pricingRecord.save();
            updateData.pricingId = savedPricing._id;
          }
        }
      } catch (error) {
        console.error("❌ Size pricing parsing error:", error.message);
        console.error("Error details:", {
          productId: id,
          hasExistingProduct: !!existingProduct,
          errorType: error.name,
        });
      }
    }

    // NEW: Auto-create/update pricing record for products with multiple sizes (no custom pricing)
    if (!sizePricing && parsedSizes.length > 1) {
      try {
        // Create equal pricing for all sizes using base price
        const sizesArray = parsedSizes.map((size) => ({
          size,
          price: Number(price),
        }));

        const basePrice = Number(price);

        if (existingProduct.pricingId) {
          // Update existing pricing record
          await pricingModel.findByIdAndUpdate(existingProduct.pricingId, {
            basePrice,
            sizes: sizesArray,
            updatedBy: req.headers.admin || "system",
          });
        } else {
          // Create new pricing record
          const pricingData = {
            productId: id,
            basePrice,
            sizes: sizesArray,
            updatedBy: req.headers.admin || "system",
          };
          const pricingRecord = new pricingModel(pricingData);
          const savedPricing = await pricingRecord.save();
          updateData.pricingId = savedPricing._id;
        }
      } catch (error) {
        console.error("❌ Auto-pricing update error:", error.message);
        console.error("Error details:", {
          productId: id,
          hasExistingProduct: !!existingProduct,
          errorType: error.name,
        });
      }
    }

    // Handle new images if uploaded - MERGE with existing images
    const finalImages = [...(existingProduct.images || [])]; // Start with existing images

    if (req.files && Object.keys(req.files).length > 0) {
      const imageSlots = [
        { key: "image1", index: 0 },
        { key: "image2", index: 1 },
        { key: "image3", index: 2 },
        { key: "image4", index: 3 },
      ];

      for (const slot of imageSlots) {
        const uploadedImage = req.files[slot.key]?.[0];

        if (uploadedImage) {
          try {
            const imageBuffer = fs.readFileSync(uploadedImage.path);
            const base64Image = `data:${
              uploadedImage.mimetype
            };base64,${imageBuffer.toString("base64")}`;

            // Replace or add image at specific index
            finalImages[slot.index] = base64Image;

            // Clean up temporary file
            if (fs.existsSync(uploadedImage.path)) {
              fs.unlinkSync(uploadedImage.path);
            }
          } catch (error) {
            console.error(
              `Error processing image ${uploadedImage.filename}:`,
              error,
            );
            throw new Error(
              `Failed to process image: ${uploadedImage.filename}`,
            );
          }
        }
      }
    }

    // Remove any undefined/null entries and set final images
    updateData.images = finalImages.filter((img) => img);

    const product = await productModel.findByIdAndUpdate(id, updateData, {
      new: true,
    });

    // ✅ Sync to JSON file
    await syncProductsToJSON();

    res.json({
      success: true,
      message: `Product Updated with ${updateData.images.length} image(s)`,
      product,
    });
  } catch (error) {
    console.log("Error in updateProduct:", error);
    res.json({ success: false, message: error.message });
  }
};

// function for single product info
const singleProduct = async (req, res) => {
  try {
    const { productId } = req.body;
    const product = await productModel
      .findById(productId)
      .populate("pricingId");
    res.json({ success: true, product });
  } catch (error) {
    res.json({ success: false, message: error.message });
  }
};
// GET all products

export {
  addProduct,
  listProducts,
  removeProduct,
  singleProduct,
  updateProduct,
  syncProductsToJSON,
};
