const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

// Connect to MongoDB
mongoose
  .connect(
    "mongodb+srv://callmeab26:Abdullah.456@ivstask.cdbhk.mongodb.net/InteractivePhoneMenu",
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.error("Failed to connect to MongoDB", err);
  });

  
// Define a schema and model for the menu options
const optionSchema = new mongoose.Schema({
  id: String,
  menu: String,
  parentId: String,
  subMenus: [ String ], // Array of strings for multiple submenus
  dial: String,
  dialExtension: String,
});

const Option = mongoose.model("Option", optionSchema);

// Define a schema and model for the submenus

const submenuSchema = new mongoose.Schema({
  subMenuId: String,
  option: { type: mongoose.Schema.Types.ObjectId, ref: "Option" },
  subMenu: String,
  dials: [{ type: mongoose.Schema.Types.ObjectId, ref: "Dial" }],
});

const Submenu = mongoose.model("Submenu", submenuSchema);

const dialSchema = new mongoose.Schema({
  id: String,
  dial: String,
  dialExtension: String,
  submenu: { type: mongoose.Schema.Types.ObjectId, ref: "Submenu" }, // Reference to the parent submenu
});

const Dial = mongoose.model("Dial", dialSchema);

//  get all options
app.get("/api/options", async (req, res) => {
  const parentId = req.query.parentId;
  if (parentId) {
    const options = await Option.find({ parentId });
    res.json(options);
  } else {
    const options = await Option.find();
    res.json(options);
  }
});


  // Add a new option
  app.post("/api/options", async (req, res) => {
    const { menu, subMenus, dial, dialExtension } = req.body;

    console.log("Received Data:", { menu, subMenus, dial, dialExtension });

    if (!menu || !Array.isArray(subMenus)) {
      return res
        .status(400)
        .json({ error: "Menu, subMenus (array), and dial are required" });
    }

    const newOption = new Option({
      id: Date.now().toString(),
      menu,
      subMenus, // Ensure this is an array of strings
      dial,
      dialExtension,
    });

    try {
      await newOption.save();
      console.log("Option saved successfully:", newOption);
      res.status(201).json(newOption);
    } catch (err) {
      console.error("Error saving option:", err.message, err.stack);
      res
        .status(500)
        .json({ error: "Failed to save option", details: err.message });
    }
  });

app.get("/api/options/:id", async (req, res) => {
  try {
    // Find the option by ID
    const option = await Option.findOne({ id: req.params.id });
    if (!option) {
      return res.status(404).json({ error: "Option not found" });
    }
    res.json(option);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch option", details: err.message });
  }
});


app.put("/api/options/:id", async (req, res) => {
  try {
    // Update the option by ID
    const updatedOption = await Option.findOneAndUpdate(
      { id: req.params.id }, // Match the `id` field
      req.body, // Update the fields with the request body
      { new: true } // Return the updated document
    );
    if (!updatedOption) {
      return res.status(404).json({ error: "Option not found" });
    }
    res.json(updatedOption);
  } catch (err) {
    res.status(500).json({ error: "Failed to update option", details: err.message });
  }
});


//  delete options
app.delete("/api/options/:id", async (req, res) => {
  await Option.findOneAndDelete({ id: req.params.id });
  res.status(204).send();
});

// POST /api/submenus
app.post("/api/submenus", async (req, res) => {
  try {
    const { parentId, subMenu, dial, dialExtension } = req.body;

    if (!parentId) {
      return res.status(400).json({ error: "Parent ID is required" });
    }

    const newSubmenu = new Submenu({
      id: Date.now().toString(),
      parentId,
      subMenu,
      dial,
      dialExtension,
    });

    await newSubmenu.save();
    res.status(201).json(newSubmenu);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to add submenu", details: err.message });
  }
});

// GET all submenus for a specific parent ID
app.get("/api/submenus", async (req, res) => {
  try {
    const parentId = req.query.id; // Use `id` instead of `parentId`
    if (!parentId) {
      return res.status(400).json({ error: "ID is required" });
    }
    const submenus = await Option.find({ parentId });
    res.json(submenus);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch submenus", details: err.message });
  }
});

// GET submenu by ID
app.get("/api/submenus/:id", async (req, res) => {
  try {
    const submenu = await Option.findOne({ id: req.params.id });
    if (!submenu) {
      return res.status(404).json({ error: "Submenu not found" });
    }
    res.json(submenu);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch submenu", details: err.message });
  }
});

// PUT update submenu
app.put("/api/submenus/:id", async (req, res) => {
  try {
    const updatedSubmenu = await Option.findOneAndUpdate(
      { id: req.params.id }, // Match the `id` field
      req.body,
      { new: true }
    );
    if (!updatedSubmenu) {
      return res.status(404).json({ error: "Submenu not found" });
    }
    res.json(updatedSubmenu);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to update submenu", details: err.message });
  }
});

app.delete('/api/submenus/:optionId/:submenuIndex', async (req, res) => {
    const { optionId, submenuIndex } = req.params;
  
    try {
      console.log(`Received request to delete submenu. Option ID: ${optionId}, Submenu Index: ${submenuIndex}`);
  
      // Find the option by the custom 'id' field
      const option = await Option.findOne({ id: optionId });
  
      console.log("Option found:", option);
  
      if (!option) {
        console.log("Option not found.");
        return res.status(404).json({ message: "Option not found" });
      }
  
      // Ensure 'submenuIndex' is a valid integer
      const index = parseInt(submenuIndex, 10);
      if (isNaN(index)) {
        console.log("Submenu index is not a number.");
        return res.status(400).json({ message: "Submenu index must be a number" });
      }
  
      // Check if the submenu index is within bounds
      if (index < 0 || index >= option.subMenus.length) {
        console.log("Invalid submenu index.");
        return res.status(400).json({ message: "Invalid submenu index" });
      }
  
      // Remove the submenu at the specified index
      const deletedSubmenu = option.subMenus.splice(index, 1);
      console.log("Deleted submenu:", deletedSubmenu);
  
      // Save the updated Option document
      await option.save();
      console.log("Option saved after submenu deletion.");
  
      res.status(200).json({
        message: "Submenu deleted successfully",
        deletedSubmenu: deletedSubmenu[0],
      });
    } catch (error) {
      console.error("Error deleting submenu:", error);
      res.status(500).json({ message: "Server error" });
    }
  });
  

// API to add a new dial
app.post("/api/dials", async (req, res) => {
    const { dial, dialExtension, submenu } = req.body;
  
    try {
      const submenuObjectId = new mongoose.Types.ObjectId(submenu);
  
      // Check if the submenu exists
      const submenuExists = await Submenu.findById(submenuObjectId);
      if (!submenuExists) {
        return res.status(400).json({ error: "Submenu not found" });
      }
  
      // Create a new dial
      const newDial = new Dial({
        id: Date.now().toString(),
        dial,
        dialExtension,
        submenu: submenuObjectId,
      });
  
      await newDial.save();
  
      // Add the dial reference to the submenu
      submenuExists.dials.push(newDial._id);
      await submenuExists.save();
  
      res.status(201).json(newDial);
    } catch (err) {
      res.status(500).json({ error: "Failed to create dial", details: err.message });
    }
  });

app.get("/api/dials", async (req, res) => {
  try {
    const dials = await Dial.find().populate("submenu");
    res.json(dials);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch dials", details: err.message });
  }
});

app.get("/api/dials", async (req, res) => {
  try {
    const dials = await Dial.find().populate("submenu");
    res.json(dials);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to fetch dials", details: err.message });
  }
});

app.put("/api/dials/:id", async (req, res) => {
  try {
    const updatedDial = await Dial.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    ).populate("submenu");
    if (!updatedDial) {
      return res.status(404).json({ error: "Dial not found" });
    }
    res.json(updatedDial);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to update dial", details: err.message });
  }
});

app.put("/api/dials/:id", async (req, res) => {
  try {
    const updatedDial = await Dial.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    ).populate("submenu");
    if (!updatedDial) {
      return res.status(404).json({ error: "Dial not found" });
    }
    res.json(updatedDial);
  } catch (err) {
    res
      .status(500)
      .json({ error: "Failed to update dial", details: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
