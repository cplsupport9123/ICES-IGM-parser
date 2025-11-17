import datetime

ASCII_29 = "\x1d"  # field separator used by Indian Customs

def generate_sgm(
    sender_code="GLOBAL16",
    receiver_code="INCCU1",
    terminal="SACHI01",
    rotation_no="5257S",
    vessel_info=None,
    cargo_records=None,
    container_records=None,
    output_file="output.sgm"
):
    now = datetime.datetime.now()
    date_str = now.strftime("%Y%m%d")
    time_str = now.strftime("%H%M")

    # Default vessel info
    vessel_info = vessel_info or {
        "port_code": "INCCU1",
        "rotation_no": "1123187",
        "rotation_date": "11022025",
        "imo_number": "9318254",
        "voyage_no": "3FSC6",
        "etd": "20250211",
        "atd": "20250211",
        "vessel_name": "MV MAERSK EMDEN",
        "call_sign": "AAFCT5406M",
        "load_port": "INCCU1",
        "master_name": "CAPT. VISHAL BHANWARIYA",
    }

    # Default cargo records
    cargo_records = cargo_records or [
        {
            "bill_no": "COSU1234567",
            "bill_date": "20250218",
            "pol": "INCCU1",
            "pod": "SGSIN",
            "shipper": "ABC EXPORTS PVT LTD",
            "consignee": "XYZ IMPORTS PTE LTD",
            "cargo_desc": "ELECTRONIC GOODS",
            "qty": "100",
            "unit": "PKG",
            "gross_weight": "5000.00"
        }
    ]

    # Default container records
    container_records = container_records or [
        {
            "container_no": "TCLU1234567",
            "seal_no": "S001",
            "size": "40",
            "fcl_lcl": "FCL",
            "tare_weight": "3800",
            "gross_weight": "5000",
            "haz_flag": "N"
        }
    ]

    lines = []

    # Header
    lines.append(
        f"HREC{ASCII_29}ZZ{ASCII_29}{sender_code}{ASCII_29}ZZ{ASCII_29}{receiver_code}"
        f"{ASCII_29}ICES1_5{ASCII_29}T{ASCII_29}{ASCII_29}{terminal}"
        f"{ASCII_29}{rotation_no}{ASCII_29}{date_str}{ASCII_29}{time_str}"
    )

    lines.append("<manifest>")

    # Vessel Info Section
    v = vessel_info
    ves_line = (
        f"F{ASCII_29}{v['port_code']}{ASCII_29}{v['rotation_no']}{ASCII_29}{v['rotation_date']}"
        f"{ASCII_29}{v['imo_number']}{ASCII_29}{v['voyage_no']}{ASCII_29}{v['etd']}"
        f"{ASCII_29}{v['atd']}{ASCII_29}{v['vessel_name']}{ASCII_29}{v['call_sign']}"
        f"{ASCII_29}{v['load_port']}{ASCII_29}1{ASCII_29}{v['master_name']}{ASCII_29}"
    )
    lines.append("<vesinfo>")
    lines.append(ves_line)
    lines.append("<END-vesinfo>")

    # Cargo Section
    lines.append("<cargo>")
    for c in cargo_records:
        cargo_line = (
            f"F{ASCII_29}{v['port_code']}{ASCII_29}{v['rotation_no']}{ASCII_29}{v['rotation_date']}"
            f"{ASCII_29}{c['bill_no']}{ASCII_29}{c['bill_date']}{ASCII_29}{c['pol']}"
            f"{ASCII_29}{c['pod']}{ASCII_29}{c['shipper']}{ASCII_29}{c['consignee']}"
            f"{ASCII_29}{c['cargo_desc']}{ASCII_29}{c['qty']}{ASCII_29}{c['unit']}"
            f"{ASCII_29}{c['gross_weight']}{ASCII_29}"
        )
        lines.append(cargo_line)
    lines.append("<END-cargo>")

    # Container Section
    lines.append("<contain>")
    for cont in container_records:
        cont_line = (
            f"F{ASCII_29}{v['port_code']}{ASCII_29}{v['rotation_no']}{ASCII_29}{v['rotation_date']}"
            f"{ASCII_29}{cont['container_no']}{ASCII_29}{cont['seal_no']}{ASCII_29}{cont['fcl_lcl']}"
            f"{ASCII_29}{cont['size']}{ASCII_29}{cont['tare_weight']}"
            f"{ASCII_29}{cont['gross_weight']}{ASCII_29}{cont['haz_flag']}"
        )
        lines.append(cont_line)
    lines.append("<END-contain>")

    lines.append("<END-manifest>")
    lines.append(f"TREC{ASCII_29}{len(cargo_records)}")

    # Write to file
    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))

    print(f"✅ SGM file generated successfully: {output_file}")


# Example usage
generate_sgm()
