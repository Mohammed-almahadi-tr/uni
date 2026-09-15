Imports System.Data.SqlClient

Public Class frmRptStudentsUnpaidList

    Sub FillColleges()
        Try
            Dim CollegeList As New ArrayList
            CollegeList = GetCollegesList()

            For Each CollegeName As String In CollegeList
                Me.CombCollege.Items.Add(CollegeName)
            Next
        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try
    End Sub

    Sub FillBatches()
        Try
            Dim BatchList As New ArrayList
            BatchList = GetBatchesList()

            For Each BatchName As String In BatchList
                Me.CombBatch.Items.Add(BatchName)
            Next
        Catch ex As Exception
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub frmRptStudentsUnpaidList_Load(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles MyBase.Load
        FillColleges()
        FillBatches()
    End Sub

    Private Sub Button2_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button2.Click
        Try
            If Me.CombCollege.SelectedIndex = -1 OrElse Me.CombBatch.SelectedIndex = -1 Then
                MsgBox("الرجاء إختيار الكلية والدفعة")
                Exit Sub
            End If

            Me.Cursor = Cursors.WaitCursor
            Dim StrSel As String

            StrSel = "Select Distinct N'" & Me.DateTimePicker1.Value.ToString & _
                     "' Descr,N'" & Me.CombCollege.SelectedItem & "' College,N'" & Me.CombBatch.SelectedItem & _
                     "' Batch,StudID,dbo.GetStdName(StudID) StudName, SUM(TotalValueOut)-SUM(TotalValueIn) TotalValueIn " & _
                     " From Transactions Where StudID In (Select StdID From StdFinancial Where " & _
                     " College=N'" & Me.CombCollege.SelectedItem & "' and Batch=N'" & Me.CombBatch.SelectedItem & _
                     "') and (Acc2<>N'رسوم الدمغة' or  Acc2 is Null) Group By StudID Having SUM(TotalValueOut)-SUM(TotalValueIn)<>0"

            Dim dap As New SqlDataAdapter(StrSel, cnn)
            Dim das As New DataSet
            das.Clear()

            cnn.Open()
            dap.Fill(das, "Transactions")
            cnn.Close()
            Dim rpt As New StudentsUnpaidList
            rpt.SetDataSource(das)
            RptViewer.CrystalReportViewer1.ReportSource = rpt
            RptViewer.CrystalReportViewer1.RefreshReport()
            RptViewer.CrystalReportViewer1.Zoom(60)
            RptViewer.ShowDialog()
            Me.Cursor = Cursors.Default
        Catch ex As Exception
            Me.Cursor = Cursors.Default
            If cnn.State = ConnectionState.Open Then
                cnn.Close()
            End If
            MsgBox(ex.ToString)
        End Try
    End Sub

    Private Sub Button1_Click(ByVal sender As System.Object, ByVal e As System.EventArgs) Handles Button1.Click
        Me.Close()
    End Sub
End Class