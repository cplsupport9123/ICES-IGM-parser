import re
import json
import xml.etree.ElementTree as ET

def parse_sgm(file_path):
    """Parse SGM manifest file into structured Python dict."""
    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
        content = f.read()

    sep = "\x1d"  # field separator

    # --- HEADER ---
    header_line = content.split("<manifest>")[0].strip()
    header_fields = header_line.split(sep)
    header = {
        "record_type": header_fields[0] if len(header_fields) > 0 else "",
        "sender_code": header_fields[2] if len(header_fields) > 2 else "",
        "receiver_code": header_fields[4] if len(header_fields) > 4 else "",
        "system_id": header_fields[5] if len(header_fields) > 5 else "",
        "terminal": header_fields[8] if len(header_fields) > 8 else "",
        "rotation_no": header_fields[9] if len(header_fields) > 9 else "",
        "date": header_fields[10] if len(header_fields) > 10 else "",
        "time": header_fields[11] if len(header_fields) > 11 else ""
    }

    
    vesinfo_match = re.search(r"<vesinfo>(.*?)<END-vesinfo>", content, re.S)
    vesinfo_data = vesinfo_match.group(1).strip() if vesinfo_match else ""
    vesinfo_fields = vesinfo_data.split(sep)
    vessel_info = {
        "port_code": vesinfo_fields[1] if len(vesinfo_fields) > 1 else "",
        "rotation_no": vesinfo_fields[2] if len(vesinfo_fields) > 2 else "",
        "rotation_date": vesinfo_fields[3] if len(vesinfo_fields) > 3 else "",
        "imo_number": vesinfo_fields[4] if len(vesinfo_fields) > 4 else "",
        "voyage_no": vesinfo_fields[5] if len(vesinfo_fields) > 5 else "",
        "call_sign": vesinfo_fields[7] if len(vesinfo_fields) > 7 else "",
        "master_name": vesinfo_fields[9] if len(vesinfo_fields) > 9 else "",
        "load_port": vesinfo_fields[10] if len(vesinfo_fields) > 10 else "",
        "discharge_port": vesinfo_fields[11] if len(vesinfo_fields) > 11 else "",
        "cargo_type": vesinfo_fields[15] if len(vesinfo_fields) > 15 else "",
        "etd": vesinfo_fields[16] if len(vesinfo_fields) > 16 else ""
    }

    # --- CARGO RECORDS ---
    cargo_section = re.search(r"<cargo>(.*)", content, re.S)
    cargo_data = cargo_section.group(1).strip() if cargo_section else ""
    cargo_records = []
    for line in cargo_data.splitlines():
        if line.startswith("S"):
            fields = line.split(sep)
            cargo_records.append({
                "record_type": fields[0],
                "port_of_loading": fields[1] if len(fields) > 1 else "",
                "imo_number": fields[2] if len(fields) > 2 else "",
                "voyage_no": fields[4] if len(fields) > 4 else "",
                "rotation_no": fields[5] if len(fields) > 5 else "",
                "bill_of_lading": fields[9] if len(fields) > 9 else "",
                "bl_date": fields[10] if len(fields) > 10 else "",
                "pol": fields[11] if len(fields) > 11 else "",
                "pod": fields[12] if len(fields) > 12 else "",
                "shipper": fields[15] if len(fields) > 15 else "",
                "consignee": fields[19] if len(fields) > 19 else "",
                "cargo_description": fields[30] if len(fields) > 30 else "",
                "quantity": fields[28] if len(fields) > 28 else "",
                "unit": fields[29] if len(fields) > 29 else "",
                "gross_weight": fields[30] if len(fields) > 30 else ""
            })

    return {
        "header": header,
        "vessel_info": vessel_info,
        "cargo_records": cargo_records
    }


def save_as_json(data, output_file):
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    print(f"✅ JSON file saved: {output_file}")


def save_as_xml(data, output_file):
    root = ET.Element("Manifest")

    header = ET.SubElement(root, "Header")
    for k, v in data["header"].items():
        ET.SubElement(header, k).text = v

    vessel = ET.SubElement(root, "VesselInfo")
    for k, v in data["vessel_info"].items():
        ET.SubElement(vessel, k).text = v

    cargo_list = ET.SubElement(root, "CargoList")
    for record in data["cargo_records"]:
        cargo = ET.SubElement(cargo_list, "CargoRecord")
        for k, v in record.items():
            ET.SubElement(cargo, k).text = v

    tree = ET.ElementTree(root)
    tree.write(output_file, encoding="utf-8", xml_declaration=True)
    print(f"✅ XML file saved: {output_file}")



if __name__ == "__main__":
    input_file = "xpress.igm"
    data = parse_sgm(input_file)
    save_as_json(data, "output_manifest.json")
    save_as_xml(data, "output_manifest.xml")


