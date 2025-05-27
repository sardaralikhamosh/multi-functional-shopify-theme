
$(document).ready(function(){
	var $range = $("#slider-range");
    var $inputFrom = $("#min_price");
    var $inputTo = $("#max_price");
    var instance;
    var min = $range.data('min');
    var max = $range.data('max');
    var prefix = $range.data('prefix');
    var from = $inputFrom.val() ? $inputFrom.val() : 0;
    var to = $inputTo.val() ? $inputTo.val() : max;
    $range.ionRangeSlider({
        skin: "round",
        type: "double",
        min: min,
        max: max,
        from: from,
        to: to,
		grid: true,
		prefix: prefix,
        onChange: updateInputs,
        onFinish: updateInputs
    });
    instance = $range.data("ionRangeSlider");
    function updateInputs (data) {
        from = data.from;
        to = data.to;
        $inputFrom.prop("value", from);
        $inputTo.prop("value", to);
    }
    
    $inputFrom.on("change", function () {
        var val = $(this).prop("value");
        if (val < min) {
            val = min;
        } else if (val > to) {
            val = to;
        }
        instance.update({
            from: val
        });
        $(this).prop("value", val);
		$('.slider-range--btn').trigger('click');
    });
    
    $inputTo.on("change", function () {
        var val = $(this).prop("value");
        if (val < from) {
            val = from;
        } else if (val > max) {
            val = max;
        }
        instance.update({
            to: val
        });
        $(this).prop("value", val);
		$('.slider-range--btn').trigger('click');
    });
});