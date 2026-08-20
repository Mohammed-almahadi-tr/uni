Public Class frmMain

    Private Sub تسجيلطلابToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmRegisteration
        a.Show()
    End Sub

    Private Sub نظامالحساباتToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmAccounts
        a.Show()
    End Sub

    Private Sub إصدارسنددفعToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmPayBill
        a.Show()
    End Sub

    Private Sub قائمةالدخلToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmRptIncomeStatement
        a.Show()
    End Sub

    Private Sub عرضمقارنةالخلللكلياتToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles عرضمقارنةالخلللكلياتToolStripMenuItem.Click
        Dim a As New frmRptCompareIncomeCollege
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmRptIncomePayments
        a.Show()
    End Sub

    Private Sub التقريرالنسبيللمنصرفاتToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmRptExpensesPerc
        a.Show()
    End Sub

    Private Sub التقريرالنسبيللإيراداتToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles التقريرالنسبيللإيراداتToolStripMenuItem.Click
        Dim a As New frmRptIncomePerc
        a.Show()
    End Sub

    Private Sub إجماليمتأخراتالكلياتToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles إجماليمتأخراتالكلياتToolStripMenuItem.Click
        Dim a As New frmRptCollegesUnpaidFeesTotal
        a.Show()
    End Sub

    Private Sub تفاصيلمتأخراتالكلياتToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles تفاصيلمتأخراتالكلياتToolStripMenuItem.Click
        Dim a As New frmRptCollegesUnpaidFeesDetails
        a.Show()
    End Sub

    Private Sub كشفبالطلابToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles كشفبالطلابToolStripMenuItem.Click
        Dim a As New frmRptStudentsUnpaidList
        a.Show()
    End Sub

    Private Sub حركةحسابالبنكToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles حركةحسابالبنكToolStripMenuItem.Click
        Dim a As New frmBankTrans
        a.Show()
    End Sub

    Private Sub تسجيلالطلابToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles تسجيلالطلابToolStripMenuItem.Click
        Dim a As New frmStdReg
        a.Show()
    End Sub

    Private Sub سندقبضرسومدراسيةToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmGetBill
        a.Show()
    End Sub

    Private Sub سندقبضمنجهةأخرىToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmGetBill2
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem3_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem3.Click
        Dim a As New frmSearchStdID
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem4_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem4.Click
        Dim a As New frmRptStudAccStatement
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem5_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem5.Click
        Dim a As New frmStdRegAcdYear
        a.Show()
    End Sub

    Private Sub تعديلملفالطالبالطالبةToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles تعديلملفالطالبالطالبةToolStripMenuItem.Click
        Dim a As New frmStdRegUpdate
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmCustody
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem6_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem6.Click
        Dim a As New frmRptIncomeColleges
        a.Show()
    End Sub

    Private Sub إزنإستلاممبلغToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles إزنإستلاممبلغToolStripMenuItem.Click
        Dim a As New frmRequestGetBill
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem7_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmRptRequests
        a.Show()
    End Sub

    Private Sub إضافةمستخدمToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmAddUser
        a.Show()
    End Sub

    Private Sub frmMain_FormClosed(ByVal sender As Object, ByVal e As System.Windows.Forms.FormClosedEventArgs) Handles Me.FormClosed
        End
    End Sub

    Private Sub عكسسندقبضرسومدراسيةToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmReverseGetBill
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem8_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem8.Click
        Dim a As New frmRptCollegesRegStudents
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem9_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmRptIncomeCollectorDetails67
        a.Show()
    End Sub

    Private Sub كشفالشواغرToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles كشفالشواغرToolStripMenuItem.Click
        Dim a As New frmStudentsVacants
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem10_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem10.Click
        Dim a As New frmDeleteStudent
        a.Show()
    End Sub

    Private Sub أرشيفسنداتالقبضToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmArchiveGetBill
        a.Show()
    End Sub

    Private Sub أرشيفالإيصالاتالمحذوفةToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmArchiveDeletedGetBills
        a.Show()
    End Sub

    Private Sub التقاريرToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles التقاريرToolStripMenuItem.Click

    End Sub

    Private Sub المسموحاتToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles المسموحاتToolStripMenuItem.Click
        Dim a As New frmRptDisc
        a.Show()
    End Sub

    Private Sub تجميعيالمسموحاتلكليةToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles تجميعيالمسموحاتلكليةToolStripMenuItem.Click
        Dim a As New frmRptCollegeDiscSummary
        a.Show()
    End Sub

    Private Sub ToolStripMenuItem11_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles ToolStripMenuItem11.Click
        Dim a As New frmRptUnivDiscSummary
        a.Show()
    End Sub

    Private Sub استمارةجديدةToolStripMenuItem_Click(ByVal sender As System.Object, ByVal e As System.EventArgs)
        Dim a As New frmRegistrationForm
        a.Show()
    End Sub


End Class
