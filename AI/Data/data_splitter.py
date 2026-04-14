import splitfolders


def split_data(
    input_folder=r"AI\Data\Raw",
    output_folder=r"AI\Data",
    seed=6767,
    ratio=(0.7, 0.2, 0.1),
):
    """Split the data into training, validation, and test sets."""
    splitfolders.ratio(
        input_folder,
        output=output_folder,
        seed=seed,
        ratio=ratio,
    )


if __name__ == "__main__":
    split_data()
