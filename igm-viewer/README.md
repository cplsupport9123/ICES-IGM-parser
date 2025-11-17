


---

# 📦 **IGM Viewer & CFS Splitter — React App**

A full-featured React application that **parses ICES 1.5 Import General Manifest (IGM) messages**, extracts cargo lines, containers, vessel details, and **automatically groups cargo by CFS**.
The app provides powerful filters, tables, previews, and **downloadable filtered IGM files**.

---

## 🚀 **Features**

### 🔍 **1. Full IGM Parsing**

Parses all relevant IGM sections:

| Section                              | Description                               |
| ------------------------------------ | ----------------------------------------- |
| **VESINFO (Part A)**                 | Vessel details                            |
| **Cargo Section (TREC / TSHC / HS)** | Cargo lines, BL details                   |
| **Container Section (CCM / CTL)**    | Containers grouped under each cargo       |
| **CFS Detection**                    | Automatically extracts CFS after LC field |

Supports mixed formatting:

*  (GS delimiters)
* Variable newlines
* Spaces or missing fields
* Multi-line cargo text
* Multi-line container lists

---

### 📊 **2. Clean & Beautiful UI (Tailwind-based)**

* Card-style sections
* Responsive grid
* Fully bordered tables
* Highlighted headers
* Compact chips for CFS values
* Smooth hover behavior

---

### 🎛 **3. Comprehensive Filters**

You can filter the parsed result by:

* **Line Number (with line name)**
* **CFS (auto-detected)**
* **Container Number**

---

### 📁 **4. CFS-wise IGM File Generation**

The app supports:

### 🔹 **Option A – Download All CFS Files (ZIP)**

Automatically generates:

```
INCCU1CIL1.igm
INCCU1CEP1.igm
INCCU1DPD1.igm
...
```

### 🔹 **Option B – Download Single CFS File**

A button appears when a CFS is selected.

### 🔹 **Option C – Full IGM with Only Filtered Cargo + Containers**

You can download the **filtered view as a valid IGM file**.

All generated files preserve:

* Proper ICES formatting
* Manifest structure
* VESINFO
* Only selected cargo lines
* Only their containers
* CFS field included

---

### 🧪 **5. Preview Before Download**

Before generating a file, a pretty preview window displays:

* CFS name
* Cargo count
* Container count
* Raw IGM output for verification

---

### 📂 **6. File Upload Options**

Supports:

* `.igm`
* `.amd`
* `.txt`
* `.csv`

Users can upload via a simple file input field.

---

## 🏗 **Tech Stack**

| Component     | Technology                     |
| ------------- | ------------------------------ |
| Framework     | React (Vite recommended)       |
| Styling       | Tailwind CSS                   |
| Excel Parser  | SheetJS (xlsx)                 |
| File Download | Blob API                       |
| ZIP Support   | JSZip                          |
| Parser Engine | Custom JavaScript (no backend) |

---

## 📁 **Project Structure**

```
igm-viewer/
│── src/
│   └── App.jsx       # Entire UI + parser in one file
│── index.html
│── package.json
│── tailwind.config.js
│── README.md
```


---

## 🔧 **Installation**

### Install dependencies

```sh
npm install
```

Include XLSX and JSZip:

```sh
npm install xlsx jszip
```

### Run development mode

```sh
npm run dev
```

### Build production bundle

```sh
npm run build
```

---

## 📥 **How to Use**

### 1️⃣ Upload IGM File

Click **Upload IGM** → select `.igm` or `.txt`.

### 2️⃣ Parsing Starts Automatically

The app extracts:

* Vessel details
* Cargo lines
* Containers
* CFS values

### 3️⃣ Apply filters

Dropdowns appear dynamically:

* Select **Line Number**
* Select **CFS**
* Filter by BL, Importer, Container

### 4️⃣ View Results

Tables show:

* Cargo data
* Container grouping
* CFS allocation

### 5️⃣ Download Output

Available options:

#### 🔹 Download CFS-wise ZIP (all CFS files)

#### 🔹 Download This CFS Only

#### 🔹 Download Current Filtered IGM



---

## 📘 **Supported IGM Format**

The app supports ICES 1.5 format, including samples like:

### Vesinfo Example

```
<vesinfo>
FINCCU111612812711202593228773FBX32517WAAYCS1374CAAYCS1374CCAPTINCCU1LKCMBLKCMBLKCMBC2CONTAINERS05112025 00:0040560YYYNYYINCCU1KKP1
<END-vesinfo>
```

### Cargo Example (TREC)

```
TREC1005061022SL1234567ABC TRADERS INDIA LIMITEDIMPORTER ADDRNAC|HS9494...
```

### Container Example

```
CCMONEU123456740HCFCLO...
```

---

## 🧷 **Known Limitations**

* Some rare IGM formats may contain irregular delimiters
* Non-standard spacing in CFS field may need manual mapping
* Does not validate HS codes / BL formats

---

## 🤝 **Contributing**

Pull requests and feature suggestions are welcome.

---

## 📜 **License**

MIT License — free for commercial and private use.

---


