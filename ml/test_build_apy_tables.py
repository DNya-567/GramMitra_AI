import os
import sys
sys.path.insert(0, os.path.dirname(__file__))

from build_apy_tables import main

def test_main_runs():
    # We'll run the main function and check that it completes without error
    # and that the output files are created.
    # Since the main function prints and writes files, we just call it.
    # We'll also check that the artifacts directory exists and contains the expected files.
    try:
        main()
    except Exception as e:
        assert False, f"main() raised an exception: {e}"

    artifacts_dir = os.path.join(os.path.dirname(__file__), 'artifacts')
    assert os.path.isdir(artifacts_dir), f"Artifacts directory not found: {artifacts_dir}"

    expected_files = [
        'district_crop_season.csv',
        'state_crop_season.csv',
        'unmatched_districts.csv',
        'crop_name_map.csv'
    ]
    for fname in expected_files:
        fpath = os.path.join(artifacts_dir, fname)
        assert os.path.isfile(fpath), f"Expected file not found: {fpath}"
        # Check that the file is not empty
        with open(fpath, 'r') as f:
            content = f.read()
            assert len(content) > 0, f"File is empty: {fpath}"
    print("All tests passed.")

if __name__ == '__main__':
    test_main_runs()